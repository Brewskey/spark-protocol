#! /usr/bin/env node
// @flow

import fs from 'fs';
import path from 'path';
import Github from 'github';
import mkdirp from 'mkdirp';
import request from 'request';
import settings from '../settings';
import nullthrows from 'nullthrows';

const GITHUB_USER = 'particle-iot';
const GITHUB_FIRMWARE_REPOSITORY = 'firmware';
const GITHUB_CLI_REPOSITORY = 'particle-cli';
const FILE_GEN_DIRECTORY = path.join(__dirname, '../../third-party/');
const MAPPING_FILE = `${FILE_GEN_DIRECTORY}versions.json`;
const SPECIFICATIONS_FILE = `${FILE_GEN_DIRECTORY}specifications.js`;
const SETTINGS_FILE = `${FILE_GEN_DIRECTORY}settings.json`;

type Asset = {
  browser_download_url: string,
  name: string,
};

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

const FIRMWARE_PLATFORMS = Object.values(
  DEFAULT_SETTINGS.knownPlatforms,
).map(platform => (platform: any).toLowerCase());
/* eslint-enable */

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
    if (fs.exists(filename)) {
      console.log(`File Exists: ${filename}`);
      resolve(filename);
      return;
    }

    console.log(`Downloading ${filename}...`);
    const file = fs.createWriteStream(
      `${settings.BINARIES_DIRECTORY}/${filename}`,
    );

    file.on('finish', () => {
      resolve(filename);
    });
    request(url)
      .pipe(file)
      .on('error', exitWithJSON);
  });

const getPlatformRegex = (platform: string): RegExp =>
  new RegExp(`(system-part\\d)-.*-${platform}\\.bin`, 'g');

const downloadFirmwareBinaries = async (
  platformReleases: Array<[string, Object]>,
): Promise<Array<string>> => {
  const assets = [].concat(
    ...platformReleases.map(([platform, release]: [string, Object]): Array<
      Object,
    > =>
      release.assets.filter((asset: Object): boolean =>
        asset.name.match(getPlatformRegex(platform)),
      ),
    ),
  );

  const assetFileNames = await Promise.all(
    assets.map((asset: Object): Promise<string> => {
      if (asset.name.match(/^system-part/)) {
        return downloadFile(asset.browser_download_url);
      }
      return Promise.resolve('');
    }),
  );

  console.log();

  return assetFileNames.filter((item: ?string): boolean => !!item);
};

const updateSettings = (
  platformReleases: Array<[string, Object]>,
): Array<string> => {
  const settingsBinaries = [];
  const versionNumbers = {};
  platformReleases.forEach(([platform, release]: [string, Object]) => {
    let versionNumber = release.tag_name;
    if (versionNumber[0] === 'v') {
      versionNumber = versionNumber.substr(1);
    }
    versionNumbers[platform] = versionNumber;
  });
  let scriptSettings = JSON.stringify(
    {
      versionNumbers,
      ...DEFAULT_SETTINGS,
    },
    null,
    2,
  );

  platformReleases.forEach(([platform, release]: [string, Object]) => {
    let versionNumber = release.tag_name;
    if (versionNumber[0] === 'v') {
      versionNumber = versionNumber.substr(1);
    }
    scriptSettings = scriptSettings.replace(
      getPlatformRegex(platform),
      (filename: string, systemPart: string): string => {
        const newFilename = `${systemPart}-${versionNumber}-${platform}.bin`;
        settingsBinaries.push(newFilename);
        return newFilename;
      },
    );
  });

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
    path: 'assets/binaries',
    repo: GITHUB_CLI_REPOSITORY,
  });

  return await Promise.all(
    assets.map((asset: Object): Promise<string> =>
      downloadFile(asset.download_url),
    ),
  );
};

(async (): Promise<*> => {
  if (!fs.existsSync(settings.BINARIES_DIRECTORY)) {
    mkdirp.sync(settings.BINARIES_DIRECTORY);
  }
  if (!fs.existsSync(FILE_GEN_DIRECTORY)) {
    mkdirp.sync(FILE_GEN_DIRECTORY);
  }

  // Download app binaries
  await downloadAppBinaries();

  // Download firmware binaries
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

  const platformReleases = FIRMWARE_PLATFORMS.map((platform: string): [
    string,
    Object,
  ] => {
    const existingRelease = releases.find((release: Object): boolean =>
      release.assets.some(
        (asset: Asset): boolean =>
          !!asset.name.match(getPlatformRegex(platform)),
      ),
    );

    return [platform, existingRelease];
  }).filter((item: [string, Object]): boolean => !!item[1]);

  const downloadedBinaries = await downloadFirmwareBinaries(platformReleases);
  const settingsBinaries = await updateSettings(platformReleases);
  verifyBinariesMatch(downloadedBinaries, settingsBinaries);

  const specificationsResponse = await githubAPI.repos.getContent({
    owner: GITHUB_USER,
    path: 'src/lib/deviceSpecs/specifications.js',
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
  if (!versionText) {
    throw new Error("can't download system-versions file");
  }

  const mapping = nullthrows(versionText.match(/^\|[^\n]*/gim))
    .map((line: string): Array<string> => line.split('|').slice(2, 5))
    .filter((arr: Array<string>): boolean => !isNaN(parseInt(arr[0], 10)))
    .map((versionData: Array<string>): Array<string> => [
      versionData[0].replace(/\s+/g, ''),
      versionData[1].replace(/\s+/g, ''),
    ]);

  if (mapping.length === 0) {
    throw new Error(
      'cant parse system-versions from ' +
        'https://github.com/spark/firmware/blob/develop/system/system-versions.md',
    );
  }
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log('\r\nCompleted Sync');
})();
