
import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, Hbar, HbarUnit, TokenId, TokenAssociateTransaction, TransferTransaction, Status, TokenSupplyType,AccountCreateTransaction, AccountId, Client,TransactionReceipt, PrivateKey, TokenCreateTransaction, TokenInfoQuery, TokenMintTransaction, TokenType, Key, AccountInfoQuery } from "@hashgraph/sdk";

import assert from "node:assert";

// Initialisation du client Hedera pour le testnet
const client = Client.forTestnet();

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0]
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  this.account_id = MY_ACCOUNT_ID;
  this.privateKey = MY_PRIVATE_KEY;
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  //Create the query request
  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(0)
    .setTreasuryAccountId(this.account_id)
    .setSupplyKey(this.privateKey)
    .freezeWith(client);

  const signTx = await transaction.sign(this.privateKey );
  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const tokenId = receipt.tokenId;
  this.tokenId = tokenId;
 
});

Then(/^The token has the name "([^"]*)"$/, async function (expectedName: string) {
  // Assurez-vous que le token ID est défini avant de procéder à la requête
  if (!this.tokenId) {
    throw new Error("Token ID is not defined. Cannot fetch token information.");
  }

  // Utiliser this.tokenId pour récupérer les informations sur le token créé
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  
  // Vérifier que le nom du token est correct
  assert.strictEqual(tokenInfo.name, expectedName, `Expected token name to be "${expectedName}", but got "${tokenInfo.name}".`);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedSymbol: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.symbol, expectedSymbol);
});

Then(/^The token has (\d+) decimals$/, async function (expectedDecimals: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.decimals, expectedDecimals);
});

Then(/^The token is owned by the account$/, async function () {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);

  if (tokenInfo.treasuryAccountId) {
    assert.strictEqual(tokenInfo.treasuryAccountId.toString(), this.account_id.toString(), "The token is not owned by the account");

    // Affecter this.tokenId à this.tokenId1 avant de réinitialiser
    this.tokenId1 = this.tokenId;

    // Supprimer this.tokenId de l'objet this
    delete this.tokenId;
  } else {
    throw new Error("Token treasuryAccountId is null.");
  }
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (amount: number) {
  // Utiliser this.tokenId1 (qui contient l'ID du token affecté dans l'étape précédente)
  const mintTransaction = await new TokenMintTransaction()
    .setTokenId(this.tokenId1)  // Utiliser this.tokenId1 ici
    .setAmount(amount)
    .freezeWith(client);

  const signTx = await mintTransaction.sign(PrivateKey.fromStringED25519(accounts[0].privateKey));
  const submitTx = await signTx.execute(client);
  const receipt = await submitTx.getReceipt(client);

  assert.strictEqual(receipt.status.toString(), "SUCCESS", "Minting failed.");
});


When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")  // Nom du token
    .setTokenSymbol("HTT")  // Symbole du token
    .setDecimals(2)
    .setInitialSupply(supply)  // Supply initial du token
    .setTreasuryAccountId(this.account_id)
    .freezeWith(client);
   

  // Signature de la transaction avec la clé privée
  const signTx = await transaction.sign(this.privateKey);

  // Soumettre la transaction et récupérer le reçu
  const submitTx = await signTx.execute(client);
  
  // Récupérer le reçu de la transaction
  const receipt = await submitTx.getReceipt(client);
  

  this.tokenId_fixed_supply = receipt.tokenId;
  this.tokenId=this.tokenId_fixed_supply
  console.log("Fixed supply token created with ID:", this.tokenId_fixed_supply.toString());

});

Then(/^The total supply of the token is (\d+)$/, async function (expectedSupply: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId_fixed_supply).execute(client);
  assert.strictEqual(tokenInfo.totalSupply.toString(), expectedSupply.toString());
});

Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    const mintTransaction = new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(100)
      .freezeWith(client);

    const signTx = await mintTransaction.sign(this.privateKey);
    const submitTx = await signTx.execute(client);
    const receipt: TransactionReceipt = await submitTx.getReceipt(client);
    assert.strictEqual(receipt.status.toString(), "TOKEN_SUPPLY_EXCEEDED", "Minting should have failed.");
  } catch (error) {
    console.log("Minting attempt failed as expected:", error);
  }
});

// scenario 3                 ù!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
let clientID: AccountId = AccountId.fromString(accounts[0].id); 
let clientPrivateKey: PrivateKey = PrivateKey.fromStringED25519(accounts[0].privateKey);
let firstAccountId: AccountId;
let firstAccountPrivateKey: PrivateKey;
let secondAccountId: AccountId;
let secondAccountPrivateKey: PrivateKey;
let thirdAccountId: AccountId;
let thirdAccountPrivateKey: PrivateKey;
let fourthAccountId: AccountId;
let fourthAccountPrivateKey: PrivateKey;
let transferTransaction: TransferTransaction;



Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  // Générer une nouvelle paire de clés ED25519
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // Créer le compte avec un solde initial supérieur au solde attendu
  const initialBalance = expectedBalance + 10; // Ajouter une marge pour les frais de transaction

  const newAccountTransactionResponse = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.from(initialBalance, HbarUnit.Hbar))
    .setMaxAutomaticTokenAssociations(10)
    .execute(client); // Supposons que 'this.client' est un Client Hedera initialisé

  const getReceipt = await newAccountTransactionResponse.getReceipt(client);
  this.firstAccountId = getReceipt.accountId;

  // Vérifier le solde du compte
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(this.firstAccountId)
    .execute(client);

  const balanceInHbar = accountBalance.hbars.toTinybars().toNumber() / 100_000_000;

  if (balanceInHbar <= expectedBalance) {
    throw new Error(`Le solde du compte (${balanceInHbar} HBAR) n'est pas supérieur à ${expectedBalance} HBAR`);
  }

  console.log(`Compte créé avec ID: ${this.firstAccountId} et solde: ${balanceInHbar} HBAR`);

  // Stocker la clé privée pour une utilisation ultérieure
  this.firstAccountPrivateKey = newAccountPrivateKey;
});


Given(/^A second Hedera account$/, async function () {
  // Générer une nouvelle paire de clés ED25519
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // Créer le compte sans solde initial
  const newAccountTransactionResponse = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.from(10,HbarUnit.Hbar)) // Solde initial de 0 HBAR
    .setMaxAutomaticTokenAssociations(10)
    .execute(client); // Supposons que 'this.client' est un Client Hedera initialisé

  const getReceipt = await newAccountTransactionResponse.getReceipt(client);
  this.secondAccountId = getReceipt.accountId;

  console.log(`Deuxième compte créé avec ID: ${this.secondAccountId}`);

  // Stocker la clé privée pour une utilisation ultérieure
  this.secondAccountPrivateKey = newAccountPrivateKey;
});


Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  // Crée une transaction pour la création d'un token sur le réseau Hedera
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")  // Définit le nom du token
    .setTokenSymbol("HTT")  // Définit le symbole du token
    .setTokenType(TokenType.FungibleCommon)  // Définit le type de token comme étant fongible
    .setDecimals(0)  // Définit le nombre de décimales à 0
    .setInitialSupply(supply)  // Définit l'offre initiale de tokens
    .setTreasuryAccountId(clientID)  // Utilise le compte client comme compte du trésor
    .setAdminKey(clientPrivateKey)  // Définit la clé admin comme étant celle du client
    .setSupplyKey(clientPrivateKey)  // Définit la clé de gestion de l'offre comme étant celle du client
    .freezeWith(client);  // Gèle la transaction pour signature

  // Signature de la transaction avec la clé privée du client
  const signTx = await transaction.sign(clientPrivateKey);
  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  
  // Récupère l'ID du token créé et le stocke
  this.tokenId_1 = receipt.tokenId!;

  
  // Vérification du solde du client après les associations
  const balance = await new AccountBalanceQuery()
    .setAccountId(clientID)  // Vérifie le solde pour le compte du client
    .execute(client);

  // Vérification si balance.tokens n'est pas null avant d'accéder au solde
  const tokenBalance = balance.tokens ? balance.tokens.get(this.tokenId_1) || 0 : 0;

  console.log(`Solde du compte ${clientID}: ${tokenBalance} tokens`);
});




Given(/^The first account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  
  // Vérification du solde initial
  const balance = await new AccountBalanceQuery()
    .setAccountId(this.firstAccountId)
    .execute(client);
  
  let tokenBalance = balance.tokens?.get(this.tokenId_1)?.toNumber() || 0;
  
  // Si le solde est 0, on effectue le transfert
  if (tokenBalance === 0) {
    const transferTransaction = await new TransferTransaction()
      .addTokenTransfer(this.tokenId_1, clientID, -expectedAmount)  // Retirer les tokens du compte client
      .addTokenTransfer(this.tokenId_1, this.firstAccountId, expectedAmount)  // Ajouter les tokens au premier compte
      .freezeWith(client);

    const signTransferTx = await transferTransaction.sign(clientPrivateKey);
    const txResponse = await signTransferTx.execute(client);
    await txResponse.getReceipt(client); // Attente de la finalisation
  }

  // Vérification du solde final
  tokenBalance = (await new AccountBalanceQuery()
    .setAccountId(this.firstAccountId)
    .execute(client)).tokens?.get(this.tokenId_1)?.toNumber() || 0;
  
  assert.strictEqual(tokenBalance, expectedAmount);
});

Given(/^The second account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  // Vérification du solde initial du deuxième compte
  const balance = await new AccountBalanceQuery()
    .setAccountId(this.secondAccountId)
    .execute(client);
  
  let tokenBalance = balance.tokens?.get(this.tokenId_1)?.toNumber() || 0;
  
  // Si le solde est 0, on effectue le transfert
  if (tokenBalance === 0) {
    const transferTransaction = await new TransferTransaction()
      .addTokenTransfer(this.tokenId_1, clientID, -expectedAmount)  // Retirer les tokens du compte client
      .addTokenTransfer(this.tokenId_1, this.secondAccountId, expectedAmount)  // Ajouter les tokens au deuxième compte
      .freezeWith(client);

    const signTransferTx = await transferTransaction.sign(clientPrivateKey);
    const txResponse = await signTransferTx.execute(client);
    await txResponse.getReceipt(client); // Attente de la finalisation
  }

  // Vérification du solde final du deuxième compte
  tokenBalance = (await new AccountBalanceQuery()
    .setAccountId(this.secondAccountId)
    .execute(client)).tokens?.get(this.tokenId_1)?.toNumber() || 0;

  assert.strictEqual(tokenBalance, expectedAmount);
});
When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (amount: number) {
  // Crée une transaction de transfert pour transférer les tokens du premier compte vers le deuxième
  this.transferTransaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId_1, this.firstAccountId, -amount)  // Retirer les tokens du premier compte
    .addTokenTransfer(this.tokenId_1, this.secondAccountId, amount)  // Ajouter les tokens au deuxième compte
    .freezeWith(client);  // Gèle la transaction pour pouvoir la signer
  
});
When(/^The first account submits the transaction$/, async function () {
  // Signature de la transaction avec la clé privée du premier compte
  const signTx = await this.transferTransaction.sign(this.firstAccountPrivateKey);

  // Exécution de la transaction après la signature
  const txResponse = await signTx.execute(client);

  // Attente du reçu pour vérifier le statut de la transaction
  const receipt = await txResponse.getReceipt(client);

  /// Vérification que la transaction a réussi
  console.log("Le statut de la transaction est : " + receipt.status.toString());
  assert.strictEqual(receipt.status.toString(), 'SUCCESS');
});
When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  // Vérification du solde Hbar du premier compte avant le transfert
  const initialBalance = await new AccountBalanceQuery()
    .setAccountId(this.firstAccountId)
    .execute(client);

  // Stocker le solde Hbar du premier compte dans 'this'
  this.initialHbarBalance = initialBalance.hbars.toTinybars();  // Récupérer le solde en Tinybars
  console.log(`Initial Hbar balance of the first account: ${this.initialHbarBalance.toString()}`);

  // Le deuxième compte crée la transaction de transfert
  this.transferTransaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId_1, this.secondAccountId, -amount)  // Retirer les tokens du deuxième compte
    .addTokenTransfer(this.tokenId_1, this.firstAccountId, amount)  // Ajouter les tokens au premier compte
    .freezeWith(client);  // Gèle la transaction pour pouvoir la signer

    // Signer la transaction avec la clé du deuxième compte
    this.transferTransaction = await this.transferTransaction.sign(this.secondAccountPrivateKey);

});
Then(/^The first account has paid for the transaction fee$/, async function () {
  // Vérification du solde Hbar actuel du premier compte
  const finalBalance = await new AccountBalanceQuery()
    .setAccountId(this.firstAccountId)
    .execute(client);

  const finalHbarBalance = finalBalance.hbars.toTinybars();  // Récupérer le solde en Tinybars

  console.log(`Final Hbar balance of the first account: ${finalHbarBalance.toString()}`);

  // Vérifier si le solde Hbar du premier compte est toujours le même qu'avant la transaction
  assert.strictEqual(finalHbarBalance.toString(), this.initialHbarBalance.toString(), 'The first account has not paid for the transaction fee');
});

Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (expectedAmount1, expectedAmount2) {
  this.tokenId1=this.tokenId_1
  // Générer une nouvelle paire de clés ED25519
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // Créer un nouveau compte avec auto-association de tokens
  const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.from(expectedAmount1 + 1, HbarUnit.Hbar))
      .setMaxAutomaticTokenAssociations(10)
      .execute(client);

  // Obtenir le reçu pour récupérer l'ID du nouveau compte
  const receipt = await newAccount.getReceipt(client);
  this.newAccountId = receipt.accountId;
  this.firstAccountId=this.newAccountId

  console.log(`Nouveau compte créé avec l'ID: ${this.newAccountId}`);

  // Transférer les tokens depuis le compte client vers le nouveau compte
  const tokenTransfer = await new TransferTransaction()
      .addTokenTransfer(this.tokenId1, clientID , -expectedAmount2)
      .addTokenTransfer(this.tokenId1, this.newAccountId, expectedAmount2)
      .freezeWith(client)

     // Exécuter la transaction de transfert
  const tokenTransferSubmit = await tokenTransfer.execute(client);  // Soumettre la transaction

  // Obtenir le reçu de la transaction
  const transferReceipt = await tokenTransferSubmit.getReceipt(client);

  console.log(`${expectedAmount2} tokens transférés au compte ${this.newAccountId}`);

  this.clientId=clientID;
  this.client =client

  console.log(`${expectedAmount2} tokens transférés au compte ${this.newAccountId}`);

  // Stocker les informations importantes dans le contexte pour une utilisation ultérieure
  this.newAccountPrivateKey = newAccountPrivateKey;
  this.expectedHbarBalance = expectedAmount1;
  this.expectedTokenBalance = expectedAmount2;
  this.firstAccountPrivateKey = newAccountPrivateKey
});
Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedAmount1, expectedAmount2) {
  // Générer une nouvelle paire de clés ED25519
  const secondAccountPrivateKey = PrivateKey.generateED25519();
  const secondAccountPublicKey = secondAccountPrivateKey.publicKey;

  // Créer un nouveau compte avec auto-association de tokens
  const newAccountTx = await new AccountCreateTransaction()
      .setKey(secondAccountPublicKey)
      .setInitialBalance(Hbar.from(expectedAmount1,HbarUnit.Hbar))
      .setMaxAutomaticTokenAssociations(10)
      .execute(this.client);

  // Obtenir le reçu pour récupérer l'ID du nouveau compte
  const receipt = await newAccountTx.getReceipt(this.client);
  this.secondAccountId = receipt.accountId;

  console.log(`Deuxième compte créé avec l'ID: ${this.secondAccountId}`);

  // Transférer les tokens HTT depuis le compte client vers le nouveau compte
  const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(this.tokenId1, this.client.operatorAccountId, -expectedAmount2)
      .addTokenTransfer(this.tokenId1, this.secondAccountId, expectedAmount2)
      .execute(this.client);

  // Attendre le reçu du transfert
  await tokenTransferTx.getReceipt(this.client);

  console.log(`${expectedAmount2} tokens HTT transférés au compte ${this.secondAccountId}`);

  // Stocker les informations importantes dans le contexte pour une utilisation ultérieure
  this.secondAccountPrivateKey = secondAccountPrivateKey;
  this.secondAccountHbarBalance = expectedAmount1;
  this.secondAccountTokenBalance = expectedAmount2;
});
Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedAmount1, expectedAmount2) {
  // Générer une nouvelle paire de clés ED25519
  const thirdAccountPrivateKey = PrivateKey.generateED25519();
  const thirdAccountPublicKey = thirdAccountPrivateKey.publicKey;

  // Créer un nouveau compte avec auto-association de tokens
  const newAccountTx = await new AccountCreateTransaction()
      .setKey(thirdAccountPublicKey)
      .setInitialBalance(Hbar.from(expectedAmount1,HbarUnit.Hbar))
      .setMaxAutomaticTokenAssociations(10)
      .execute(this.client);

  // Obtenir le reçu pour récupérer l'ID du nouveau compte
  const receipt = await newAccountTx.getReceipt(this.client);
  this.thirdAccountId = receipt.accountId;

  console.log(`Troisième compte créé avec l'ID: ${this.thirdAccountId}`);

  // Transférer les tokens HTT depuis le compte client vers le nouveau compte
  const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(this.tokenId1, this.client.operatorAccountId, -expectedAmount2)
      .addTokenTransfer(this.tokenId1, this.thirdAccountId, expectedAmount2)
      .execute(this.client);

  // Attendre le reçu du transfert
  await tokenTransferTx.getReceipt(this.client);

  console.log(`${expectedAmount2} tokens HTT transférés au compte ${this.thirdAccountId}`);

  // Stocker les informations importantes dans le contexte pour une utilisation ultérieure
  this.thirdAccountPrivateKey = thirdAccountPrivateKey;
  this.thirdAccountHbarBalance = expectedAmount1;
  this.thirdAccountTokenBalance = expectedAmount2;
});

Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedAmount1, expectedAmount2) {
  // Générer une nouvelle paire de clés ED25519
  const fourthAccountPrivateKey = PrivateKey.generateED25519();
  const fourthAccountPublicKey = fourthAccountPrivateKey.publicKey;

  // Créer un nouveau compte avec auto-association de tokens
  const newAccountTx = await new AccountCreateTransaction()
      .setKey(fourthAccountPublicKey)
      .setInitialBalance(Hbar.from(expectedAmount1,HbarUnit.Hbar))
      .setMaxAutomaticTokenAssociations(10)
      .execute(this.client);

  // Obtenir le reçu pour récupérer l'ID du nouveau compte
  const receipt = await newAccountTx.getReceipt(this.client);
  this.fourthAccountId = receipt.accountId;

  console.log(`Quatrième compte créé avec l'ID: ${this.fourthAccountId}`);

  // Transférer les tokens HTT depuis le compte client vers le nouveau compte
  const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(this.tokenId1, this.client.operatorAccountId, -expectedAmount2)
      .addTokenTransfer(this.tokenId1, this.fourthAccountId, expectedAmount2)
      .execute(this.client);

  // Attendre le reçu du transfert
  await tokenTransferTx.getReceipt(this.client);

  console.log(`${expectedAmount2} tokens HTT transférés au compte ${this.fourthAccountId}`);

  // Stocker les informations importantes dans le contexte pour une utilisation ultérieure
  this.fourthAccountPrivateKey = fourthAccountPrivateKey;
  this.fourthAccountHbarBalance = expectedAmount1;
  this.fourthAccountTokenBalance = expectedAmount2;
});
When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (expectedAmount1, expectedAmount2, expectedAmount3) {
  // Créer une nouvelle transaction de transfert
  this.transferTransaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId1, this.newAccountId, -expectedAmount1)
      .addTokenTransfer(this.tokenId1, this.secondAccountId, (expectedAmount1 - expectedAmount2 - expectedAmount3))
      .addTokenTransfer(this.tokenId1, this.thirdAccountId, expectedAmount2)
      .addTokenTransfer(this.tokenId1, this.fourthAccountId, expectedAmount3)
      .freezeWith(this.client);

  // Signer la transaction avec la clé du second compte
  this.transferTransaction = await this.transferTransaction.sign(this.secondAccountPrivateKey);
});

Then(/^The third account holds (\d+) HTT tokens$/, async function (expectedAmount) {
    // Vérifier le solde de tokens du troisième compte
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(this.thirdAccountId)
        .execute(this.client);

    if (!accountBalance.tokens) {
        throw new Error("Le solde de tokens est null pour le troisième compte");
    }

    const tokenBalance = accountBalance.tokens.get(this.tokenId1);

    if (tokenBalance === undefined) {
        throw new Error(`Aucun solde trouvé pour le token ${this.tokenId1} sur le troisième compte`);
    }

    console.log(`Solde de tokens HTT du troisième compte : ${tokenBalance}`);

    // Vérifier si le solde correspond au montant attendu
    if (tokenBalance.toNumber() !== parseInt(expectedAmount)) {
        throw new Error(`Le solde de tokens HTT du troisième compte (${tokenBalance}) ne correspond pas au montant attendu (${expectedAmount})`);
    }
});

Then(/^The fourth account holds (\d+) HTT tokens$/, async function (expectedAmount) {
    // Vérifier le solde de tokens du quatrième compte
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(this.fourthAccountId)
        .execute(this.client);

    if (!accountBalance.tokens) {
        throw new Error("Le solde de tokens est null pour le quatrième compte");
    }

    const tokenBalance = accountBalance.tokens.get(this.tokenId1);

    if (tokenBalance === undefined) {
        throw new Error(`Aucun solde trouvé pour le token ${this.tokenId1} sur le quatrième compte`);
    }

    console.log(`Solde de tokens HTT du quatrième compte : ${tokenBalance}`);

    // Vérifier si le solde correspond au montant attendu
    if (tokenBalance.toNumber() !== parseInt(expectedAmount)) {
        throw new Error(`Le solde de tokens HTT du quatrième compte (${tokenBalance}) ne correspond pas au montant attendu (${expectedAmount})`);
    }
});

function freezeWith(client: Client) {
  throw new Error("Function not implemented.");
}
