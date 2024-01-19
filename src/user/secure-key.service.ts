// secure-key.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto-js';

@Injectable()
export class SecureKeyService {
  generateRandomString(lengthMax?: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    let length = 6
    if (!lengthMax) {
      length = 6
    } else {
      length = lengthMax
    }

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }


  // Function to encrypt the private key
  encryptPrivateKey(privateKey: string, password: string): { iv: string; encryptedData: string } {
    const iv = crypto.lib.WordArray.random(16).toString();
    const key = crypto.PBKDF2(password, iv, { keySize: 256 / 32, iterations: 10000 });

    const encryptedData = crypto.AES.encrypt(privateKey, key, {
      iv: crypto.enc.Hex.parse(iv)
      , mode: crypto.mode.CBC
    }).toString();

    return { iv, encryptedData };
  }

  // Function to decrypt the private key
  decryptPrivateKey(encryptedData: string, iv: string, password: string): string {
    try {
      const key = crypto.PBKDF2(password, iv, { keySize: 256 / 32, iterations: 10000 });

      const decryptedData = crypto.AES.decrypt(encryptedData, key, {
        iv: crypto.enc.Hex.parse(iv)
        , mode: crypto.mode.CBC
      });

      return decryptedData.toString(crypto.enc.Utf8);
    }
    catch (e) {
      console.log("ERROR decryptPrivateKey")

    }

  }
}
