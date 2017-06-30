// @flow

import fs from 'fs';
import path from 'path';
import Github from 'github';
import mkdirp from 'mkdirp';
import request from 'request';
import settings from '../settings';
import nullthrows from 'nullthrows';

type Asset = {
  browser_download_url: string,
  name: string,
};

const GITHUB_USER = 'spark';
const GITHUB_FIRMWARE_REPOSITORY = 'firmware';
const GITHUB_CLI_REPOSITORY = 'particle-cli';
const FILE_GEN_DIRECTORY = path.join(__dirname, '../../third-party/');
const MAPPING_FILE = `${FILE_GEN_DIRECTORY}versions.json`;
const SPECIFICATIONS_FILE = `${FILE_GEN_DIRECTORY}specifications.js`;
const SETTINGS_FILE = `${FILE_GEN_DIRECTORY}settings.json`;

// This default is here so that the regex will work when updating these files.
/* eslint-disable */
const DEFAULT_SETTINGS = {
  knownApps: {
    deep_update_2014_06: true,
    cc3000: true,
    cc3000_1_14: true,
    tinker: true,
    voodoo: true,
  },
  knownPlatforms: {
    '0': 'Core',
    '6': 'Photon',
    '8': 'P1',
    '10': 'Electron',
    '88': 'Duo',
    '103': 'Bluz',
  },
  updates: {
    '2b04:d006': {
      systemFirmwareOne: 'system-part1-0.6.0-photon.bin',
      systemFirmwareTwo: 'system-part2-0.6.0-photon.bin',
    },
    '2b04:d008': {
      systemFirmwareOne: 'system-part1-0.6.0-p1.bin',
      systemFirmwareTwo: 'system-part2-0.6.0-p1.bin',
    },
    '2b04:d00a': {
      // The bin files MUST be in this order to be flashed to the correct memory locations
      systemFirmwareOne: 'system-part2-0.6.0-electron.bin',
      systemFirmwareTwo: 'system-part3-0.6.0-electron.bin',
      systemFirmwareThree: 'system-part1-0.6.0-electron.bin',
    },
  },
};
/* eslint-enable */

let versionTag = '';
const githubAPI = new Github();

const exitWithMessage = (message: string) => {
  console.log(message);
  process.exit(0);
};

const exitWithJSON = (json: Object) => {
  exitWithMessage(JSON.stringify(json, null, 2));
};

const downloadFile = (url: string): Promise<*> =>
  new Promise((resolve: (filename: string) => void) => {
    const filename = nullthrows(url.match(/.*\/(.*)/))[1];
    console.log(`Downloading ${filename}...`);

    const file = fs.createWriteStream(
      `${settings.BINARIES_DIRECTORY}/${filename}`,
    );

    file.on('finish', (): void => file.close((): void => resolve(filename)));
    request(url).pipe(file).on('error', exitWithJSON);
  });

const downloadFirmwareBinaries = async (
  assets: Array<Asset>,
): Promise<Array<string>> => {
  const assetFileNames = await Promise.all(
    assets.map((asset: Object): Promise<string> => {
      if (asset.name.match(/^system-part/)) {
        return downloadFile(asset.browser_download_url);
      }
      return Promise.resolve('');
    }),
  );

  return assetFileNames.filter((item: ?string): boolean => !!item);
};

const updateSettings = (): Array<string> => {
  let versionNumber = versionTag;
  if (versionNumber[0] === 'v') {
    versionNumber = versionNumber.substr(1);
  }

  let scriptSettings = JSON.stringify(
    {
      versionNumber,
      ...DEFAULT_SETTINGS,
    },
    null,
    2,
  );

  const settingsBinaries = [];
  scriptSettings = scriptSettings.replace(
    /(system-part\d-).*(-.*.bin)/g,
    (filename: string, part: string, device: string): string => {
      const newFilename = part + versionNumber + device;
      settingsBinaries.push(newFilename);
      return newFilename;
    },
  );

  fs.writeFileSync(SETTINGS_FILE, scriptSettings);
  console.log('Updated settings');

  return settingsBinaries;
};

const verifyBinariesMatch = (
  downloadedBinaries: Array<string>,
  settingsBinaries: Array<string>,
) => {
  if (
    JSON.stringify(downloadedBinaries.sort()) !==
    JSON.stringify(settingsBinaries.sort())
  ) {
    console.log(
      "\n\nWARNING: the list of downloaded binaries doesn't match the list " +
        'of binaries in settings.js',
    );
    console.log('Downloaded:  ', downloadedBinaries);
    console.log('settings.js: ', settingsBinaries);
  }
};

const downloadAppBinaries = async (): Promise<*> => {
  const assets = await githubAPI.repos.getContent({
    owner: GITHUB_USER,
    path: 'binaries',
    repo: GITHUB_CLI_REPOSITORY,
  });

  return await Promise.all(
    assets.map((asset: Object): Promise<string> =>
      downloadFile(asset.download_url),
    ),
  );
};

(async (): Promise<*> => {
  // Start running process. If you pass `0.6.0` it will install that version of
  // the firmware.
  versionTag = process.argv[2];
  if (versionTag && versionTag[0] !== 'v') {
    versionTag = `v${versionTag}`;
  }

  if (!fs.existsSync(settings.BINARIES_DIRECTORY)) {
    mkdirp.sync(settings.BINARIES_DIRECTORY);
  }
  if (!fs.existsSync(FILE_GEN_DIRECTORY)) {
    mkdirp.sync(FILE_GEN_DIRECTORY);
  }

  // Download app binaries
  await downloadAppBinaries();

  // Download firmware binaries
  if (process.argv.length !== 3) {
    let releases = await githubAPI.repos.getReleases({
      owner: GITHUB_USER,
      page: 0,
      perPage: 30,
      repo: GITHUB_FIRMWARE_REPOSITORY,
    });
    releases = releases.filter(
      (release: Object): boolean =>
        // Don't use release candidates.. we only need main releases.
        !release.tag_name.includes('-rc') &&
        !release.tag_name.includes('-pi') &&
        release.assets.length > 2,
    );

    releases.sort((a: Object, b: Object): number => {
      if (a.tag_name < b.tag_name) {
        return 1;
      }
      if (a.tag_name > b.tag_name) {
        return -1;
      }
      return 0;
    });

    versionTag = releases[0].tag_name;
  }

  const release = await githubAPI.repos.getReleaseByTag({
    owner: GITHUB_USER,
    repo: GITHUB_FIRMWARE_REPOSITORY,
    tag: versionTag,
  });

  const downloadedBinaries = await downloadFirmwareBinaries(release.assets);
  const settingsBinaries = await updateSettings();
  verifyBinariesMatch(downloadedBinaries, settingsBinaries);

  const specificationsResponse = await githubAPI.repos.getContent({
    owner: GITHUB_USER,
    path: 'oldlib/deviceSpecs/specifications.js',
    repo: GITHUB_CLI_REPOSITORY,
  });

  fs.writeFileSync(
    SPECIFICATIONS_FILE,
    new Buffer(specificationsResponse.content, 'base64').toString(),
  );

  const versionResponse = await githubAPI.repos.getContent({
    owner: GITHUB_USER,
    path: 'system/system-versions.md',
    repo: GITHUB_FIRMWARE_REPOSITORY,
  });

  const versionText =
    new Buffer(versionResponse.content, 'base64').toString() || '';
  const data = versionText
    .match(/^\|[^\n]*/gim)
    .map((line: string): Array<string> => line.split('|').slice(2, 5))
    .filter((arr: Array<string>): boolean => !isNaN(parseInt(arr[0], 10)))
    .map((vdata: Array<any>): Array => [
      vdata[0].replace(/\s+/g, ''),
      vdata[1].replace(/\s+/g, ''),
    ]);
  if (data.length === 0) {
    console.log(
      'cant parse system-versions from https://github.com/spark/firmware/blob/develop/system/system-versions.md',
    );
  }
  const mapping = [];
  for (let line = 0; line < data.length; line += 1) {
    mapping.push(data[line]);
  }
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log('\r\nCompleted Sync');
})();
