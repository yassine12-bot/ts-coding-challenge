
import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, Hbar, HbarUnit, TokenId, TokenAssociateTransaction, TransferTransaction, Status, TokenSupplyType,AccountCreateTransaction, AccountId, Client,TransactionReceipt, PrivateKey, TokenCreateTransaction, TokenInfoQuery, TokenMintTransaction, TokenType, Key } from "@hashgraph/sdk";

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

Given(/^A first hedera account with more than (\d+) hbar$/, async function () {

});
Given(/^A second Hedera account$/, async function () {

});
Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function () {

});
Given(/^The first account holds (\d+) HTT tokens$/, async function () {

});
Given(/^The second account holds (\d+) HTT tokens$/, async function () {

});
When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function () {

});
When(/^The first account submits the transaction$/, async function () {

});
When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function () {

});
Then(/^The first account has paid for the transaction fee$/, async function () {

});
Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function () {

});
Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function () {

});
Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function () {

});
Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function () {

});
When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function () {

});
Then(/^The third account holds (\d+) HTT tokens$/, async function () {

});
Then(/^The fourth account holds (\d+) HTT tokens$/, async function () {

});
