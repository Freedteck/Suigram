import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { SerializedSignature, decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import {
    genAddressSeed,
    generateNonce,
    generateRandomness,
    getExtendedEphemeralPublicKey,
    getZkLoginSignature,
    jwtToAddress,
} from '@mysten/zklogin';
import { config } from '../config';
import { jwtDecode } from 'jwt-decode';
import axios, { AxiosRequestConfig } from 'axios';

const FULLNODE_URL = 'https://fullnode.devnet.sui.io';
const suiClient = new SuiClient({ url: FULLNODE_URL });

type OpenIdProvider = 'Google';

type SetupData = {
    provider: OpenIdProvider;
    maxEpoch: number;
    randomness: string;
    ephemeralPrivateKey: string;
}

type AccountData = {
    provider: OpenIdProvider;
    userAddr: string;
    zkProofs: any;
    ephemeralPrivateKey: string;
    userSalt: string;
    sub: string;
    aud: string;
    maxEpoch: number;
}

function generateEphemeral() {
    const ephemeralKeyPair = new Ed25519Keypair();
    return ephemeralKeyPair
}

async function getNonce(ephemeralKeyPair: Ed25519Keypair, maxEpoch: number, randomness: string ) : Promise<string> {  
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
    return nonce;
}

export async function initializeZkLogin(provider: OpenIdProvider) {
    const ephemeralKeyPair = generateEphemeral()
    const randomness = generateRandomness();
    const { epoch } = await  suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 2; // this means the ephemeral key will be active for 2 epochs from now.

    const nonce = await getNonce(ephemeralKeyPair, maxEpoch, randomness)
    const setupData = {
        provider,
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPrivateKey: ephemeralKeyPair.getSecretKey()
    }

    const urlBaseParams = {
        nonce,
        redirect_uri: 'http://localhost:5000/auth/google-redirect',
        response_type: 'id_token',
        scope: 'openid',
        client_id: config.CLIENT_ID_GOOGLE,

    }
    let loginUrl: string;

    const urlParams = new URLSearchParams(JSON.stringify(urlBaseParams));
    loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${urlParams.toString()}`

    return {      
        ...setupData,
        loginUrl,
        redirect_uri: urlBaseParams.redirect_uri
    }
}

function keypairFromSecretKey(privateKeyBase64: string): Ed25519Keypair {
    const keyPair = decodeSuiPrivateKey(privateKeyBase64);
    return Ed25519Keypair.fromSecretKey(keyPair.secretKey);
}

export async function finalizeZkLogin(idToken: string, setupData: SetupData) {
    const jwtPayload = jwtDecode(idToken);
    if (!jwtPayload.sub || !jwtPayload.aud) {
        console.warn('[finalizeZkLogin] missing jwt.sub or jwt.aud');
        throw new Error(
            'missing jwt.sub or jwt.aud'
        ) 
    }
    const requestOptions : AxiosRequestConfig =
            config.URL_SALT_SERVICE === '/dummy-salt-service.json'
            ? // dev, using a JSON file (same salt all the time)
            {
                method: 'GET',
            }
            : // prod, using an actual salt server
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ idToken }),
            };
    const saltResponse: {response: {salt: string}} | null  = await axios.request(requestOptions)
    
    if(!saltResponse) {
        throw new Error(
            'salt not generated'
        )
    }
    const userSalt = BigInt(saltResponse.response.salt);
    const userAddr = jwtToAddress(idToken, userSalt);

    const ephemeralKeyPair = keypairFromSecretKey(setupData.ephemeralPrivateKey)
    const ephemeralPublicKey = ephemeralKeyPair.getPublicKey()
    const payload = JSON.stringify({
        maxEpoch: setupData.maxEpoch,
        jwtRandomness: setupData.randomness,
        extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(ephemeralPublicKey),
        idToken,
        salt: userSalt.toString(),
        keyClaimName: 'sub',
    }, null, 2);
    // Request zkProof

    const zkProofs = await axios.post(config.URL_ZK_PROVER, payload)
    if(!zkProofs) {
        throw new Error('Something occured while generating proof')
    }

    return {
        provider: setupData.provider,
        userAddr,
        zkProofs,
        ephemeralPrivateKey: setupData.ephemeralPrivateKey,
        userSalt: userSalt.toString(),
        sub: jwtPayload.sub,
        aud: typeof jwtPayload.aud === 'string' ? jwtPayload.aud : jwtPayload.aud[0],
        maxEpoch: setupData.maxEpoch,
    }
}

export async function sendTransaction(account: AccountData) {

    // Sign the transaction bytes with the ephemeral private key
    const txb = new TransactionBlock();
    txb.setSender(account.userAddr);

    const ephemeralKeyPair = keypairFromSecretKey(account.ephemeralPrivateKey);
    const { bytes, signature: userSignature } = await txb.sign({
        client: suiClient,
        signer: ephemeralKeyPair,
    });

    // Generate an address seed by combining userSalt, sub (subject ID), and aud (audience)
    const addressSeed = genAddressSeed(
        BigInt(account.userSalt),
        'sub',
        account.sub,
        account.aud,
    ).toString();

    // Serialize the zkLogin signature by combining the ZK proof (inputs), the maxEpoch,
    // and the ephemeral signature (userSignature)
    const zkLoginSignature : SerializedSignature = getZkLoginSignature({
        inputs: {
            ...account.zkProofs,
            addressSeed,
        },
        maxEpoch: account.maxEpoch,
        userSignature,
    });

    // Execute the transaction
    await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkLoginSignature,
        options: {
            showEffects: true,
        },
    })
    .then(result => {
        return result
    })
    .catch((error: unknown) => {
        console.warn('[sendTransaction] executeTransactionBlock failed:', error);
        return null;
    })
}
    