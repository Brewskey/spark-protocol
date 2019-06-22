#! /usr/bin/env node
// @flow

import fs from 'fs';
import path from 'path';
import Github from '@octokit/rest';
import mkdirp from 'mkdirp';
import settings from '../settings';
import { HalModuleParser } from 'binary-version-reader';
import dotenv from 'dotenv';

let fileDirectory = path.resolve(process.cwd());
let filePath = null;

// A counter is a lot safer than a while(true)
let count = 0;
while (count < 20) {
  count += 1;
  filePath = path.join(fileDirectory, '.env');
  console.log('Checking for .env: ', filePath);
  if (fs.existsSync(filePath)) {
    break;
  }

  const newFileDirectory = path.join(fileDirectory, '..');
  if (newFileDirectory === fileDirectory) {
    filePath = null;
    break;
  }
  fileDirectory = newFileDirectory;
}

if (!filePath) {
  dotenv.config();
} else {
  dotenv.config({
    path: filePath,
  });
}

const GITHUB_USER = 'particle-iot';
const GITHUB_FIRMWARE_REPOSITORY = 'firmware';
const GITHUB_CLI_REPOSITORY = 'particle-cli';
const FILE_GEN_DIRECTORY = path.join(__dirname, '../../third-party/');
const SETTINGS_FILE = `${FILE_GEN_DIRECTORY}settings.json`;

type Asset = {
  browser_download_url: string,
  id: string,
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

const FIRMWARE_PLATFORMS = Object.values(DEFAULT_SETTINGS.knownPlatforms).map(
  platform => (platform: any).toLowerCase(),
);
/* eslint-enable */

const githubAPI = new Github();

const {
  GITHUB_AUTH_PASSWORD,
  GITHUB_AUTH_TYPE,
  GITHUB_AUTH_TOKEN,
  GITHUB_AUTH_USERNAME,
} = process.env;

if (!GITHUB_AUTH_TYPE) {
  throw new Error('You need to set up a .env file with auth credentials');
}

if (GITHUB_AUTH_TYPE === 'oauth') {
  githubAPI.authenticate({
    token: GITHUB_AUTH_TOKEN,
    type: GITHUB_AUTH_TYPE,
  });
} else {
  githubAPI.authenticate({
    password: GITHUB_AUTH_PASSWORD,
    type: GITHUB_AUTH_TYPE,
    username: GITHUB_AUTH_USERNAME,
  });
}

const downloadAssetFile = async (asset: Asset): Promise<*> => {
  const filename = asset.name;
  const fileWithPath = `${settings.BINARIES_DIRECTORY}/${filename}`;
  if (fs.existsSync(fileWithPath)) {
    console.log(`File Exists: ${filename}`);
    return filename;
  }

  console.log(`Downloading ${filename}...`);

  return githubAPI.repos
    .getReleaseAsset({
      headers: {
        accept: 'application/octet-stream',
      },
      id: asset.id,
      owner: GITHUB_USER,
      repo: GITHUB_FIRMWARE_REPOSITORY,
    })
    .then(
      (response: any): string => {
        fs.writeFileSync(fileWithPath, response.data);
        return filename;
      },
    )
    .catch((error: Error): void => console.error(asset, error));
};

const downloadBlob = async (asset: any): Promise<*> => {
  const filename = asset.name;
  const fileWithPath = `${settings.BINARIES_DIRECTORY}/${filename}`;
  if (fs.existsSync(fileWithPath)) {
    console.log(`File Exists: ${filename}`);
    return filename;
  }

  console.log(`Downloading ${filename}...`);

  return githubAPI.gitdata
    .getBlob({
      file_sha: asset.sha,
      headers: {
        accept: 'application/vnd.github.v3.raw',
      },
      owner: GITHUB_USER,
      repo: GITHUB_CLI_REPOSITORY,
    })
    .then(
      (response: any): string => {
        fs.writeFileSync(fileWithPath, response.data);
        return filename;
      },
    )
    .catch((error: Error): void => console.error(error));
};

const downloadFirmwareBinaries = async (
  assets: Array<Asset>,
): Promise<Array<string>> => {
  const assetFileNames = await Promise.all(
    assets.map(
      (asset: Object): Promise<string> => {
        if (asset.name.match(/(system-part|bootloader)/)) {
          return downloadAssetFile(asset);
        }
        return Promise.resolve('');
      },
    ),
  );

  console.log();

  return assetFileNames.filter((item: ?string): boolean => !!item);
};

const updateSettings = async (
  binaryFileNames: Array<string>,
): Promise<void> => {
  const parser = new HalModuleParser();

  const moduleInfos = await Promise.all(
    binaryFileNames.map(
      (filename: string): Promise<any> =>
        new Promise(
          (resolve: (result: any) => void): void =>
            parser.parseFile(
              `${settings.BINARIES_DIRECTORY}/${filename}`,
              (result: any) => {
                resolve({
                  ...result,
                  fileBuffer: undefined,
                  filename,
                });
              },
            ),
        ),
    ),
  );

  const scriptSettings = JSON.stringify(moduleInfos, null, 2);

  fs.writeFileSync(SETTINGS_FILE, scriptSettings);
  console.log('Updated settings');
};

const downloadAppBinaries = async (): Promise<*> => {
  const assets = await githubAPI.repos.getContents({
    owner: GITHUB_USER,
    path: 'assets/binaries',
    repo: GITHUB_CLI_REPOSITORY,
  });
  return await Promise.all(
    assets.data.map((asset: Object): Promise<string> => downloadBlob(asset)),
  );
};

(async (): Promise<*> => {
  try {
    if (!fs.existsSync(settings.BINARIES_DIRECTORY)) {
      mkdirp.sync(settings.BINARIES_DIRECTORY);
    }
    if (!fs.existsSync(FILE_GEN_DIRECTORY)) {
      mkdirp.sync(FILE_GEN_DIRECTORY);
    }

    try {
      // Download app binaries
      await downloadAppBinaries();
    } catch (error) {
      console.error(error);
    }
    // Download firmware binaries
    let releases = await githubAPI.repos.listReleases({
      owner: GITHUB_USER,
      page: 0,
      perPage: 100,
      repo: GITHUB_FIRMWARE_REPOSITORY,
    });
    let { data } = releases;
    while (githubAPI.hasNextPage(releases)) {
      releases = await githubAPI.getNextPage(releases);
      data = data.concat(releases.data);
    }

    data.sort(
      (a: Object, b: Object): number => {
        if (a.tag_name < b.tag_name) {
          return 1;
        }
        if (a.tag_name > b.tag_name) {
          return -1;
        }
        return 0;
      },
    );

    const assets = [].concat(
      ...data.map((release: any): Array<any> => release.assets),
    );

    const downloadedBinaries = await downloadFirmwareBinaries(assets);
    await updateSettings(downloadedBinaries);

    console.log('\r\nCompleted Sync');
  } catch (err) {
    console.log(err);
  }
})();
