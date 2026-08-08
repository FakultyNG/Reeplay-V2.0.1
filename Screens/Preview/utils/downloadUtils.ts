import * as Keychain from 'react-native-keychain';
import Aes from 'react-native-aes-crypto';
import RNFS from 'react-native-fs';
import { AES_CREDENTIALS_KEY } from '@env';

type DownloadWithProgressParams = {
  url: string;
  filename: string;
  onProgress?: (percent: number) => void;
};

export const downloadAndSave = async ({ url, filename, onProgress }: DownloadWithProgressParams) => {
  const downloadDest = `${RNFS.DocumentDirectoryPath}/${filename}`;

  const result = RNFS.downloadFile({
    fromUrl: url,
    toFile: downloadDest,
    progressDivider: 1, // Progress updates every 1%
    begin: () => console.log('Download started'),
    progress: (data) => {
      const percentage = Math.floor((data.bytesWritten / data.contentLength) * 100);
      if (onProgress) onProgress(percentage);
    },
  });

  const response = await result.promise;

  return response.statusCode === 200 ? downloadDest : null;
};

export const encryptFile = async (filePath: string, encryptedPath: string, key: string, iv: string) => {
  const fileData = await RNFS.readFile(filePath, 'base64');
  const encrypted = await Aes.encrypt(fileData, key, iv, 'aes-256-cbc');
  await RNFS.writeFile(encryptedPath, encrypted, 'base64');
};

export const decryptFile = async (encryptedPath: string, key: string, iv: string): Promise<string> => {
  const encryptedData = await RNFS.readFile(encryptedPath, 'base64');
  const decrypted = await Aes.decrypt(encryptedData, key, iv, 'aes-256-cbc');
  const tempPath = `${RNFS.TemporaryDirectoryPath}/temp.mp4`;
  await RNFS.writeFile(tempPath, decrypted, 'base64');
  return tempPath;
};

export const generateAESKeys = async () => {
  const key = await Aes.randomKey(32);
  const iv = await Aes.randomKey(16);
  return { key, iv };
};


const AES_KEYCHAIN_SERVICE = 'com.reeplay.aes';

export const saveAESKeys = async (key: string, iv: string) => {
  const credentials = JSON.stringify({ key, iv });
  await Keychain.setGenericPassword(AES_CREDENTIALS_KEY, credentials, {
    service: AES_KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const getAESKeys = async (): Promise<{ key: string; iv: string } | null> => {
  // Prefer dedicated service; fall back to legacy default service once.
  let result = await Keychain.getGenericPassword({
    service: AES_KEYCHAIN_SERVICE,
  });

  if (!result) {
    const legacy = await Keychain.getGenericPassword();
    if (legacy && legacy.username === AES_CREDENTIALS_KEY) {
      result = legacy;
      try {
        await Keychain.setGenericPassword(AES_CREDENTIALS_KEY, legacy.password, {
          service: AES_KEYCHAIN_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } catch {
        // Ignore migration write failures; read path still works from legacy.
      }
    }
  }

  if (result && result.username === AES_CREDENTIALS_KEY) {
    try {
      return JSON.parse(result.password);
    } catch {
      return null;
    }
  }
  return null;
};