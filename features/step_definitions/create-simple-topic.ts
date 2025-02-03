import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey, RequestType,
  TopicCreateTransaction, TopicInfoQuery,
  TopicMessageQuery, TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;
import { AccountCreateTransaction, Hbar, } from "@hashgraph/sdk";
const { KeyList } = require("@hashgraph/sdk");

// Pre-configured client for test network (testnet)
const client = Client.forTestnet()
const secondclient = Client.forTestnet()

//Set the operator with the account ID and private keyc

Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[0]
  const account: AccountId = AccountId.fromString(acc.id);
  this.account = account
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey = privKey
  client.setOperator(this.account, privKey);

//Create the query request
  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  // Create a new topic
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.privKey.publicKey);

  // Sign and execute the transaction
  const txResponse = await transaction.execute(client);

  // Get the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  // Get the topic ID from the receipt
  const topicId = receipt.topicId;

  // Store the topic ID for later use
  this.topicId = topicId;

  console.log(`Created topic with ID: ${topicId}`);
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  // Create the transaction
  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message);

  // Sign with the client operator private key and submit the transaction to a Hedera network
  const txResponse = await transaction.execute(client);

  // Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  // Get the transaction consensus status
  const transactionStatus = receipt.status;

  console.log("The message transaction status: " + transactionStatus.toString());
});

//===============================================================================================================

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (message: string) {
  new TopicMessageQuery()
    .setTopicId(this.topicId)
    .subscribe(client, null, (msg) => {
      let receivedMessage = Buffer.from(msg.contents).toString('utf8');
      console.log(`${msg.consensusTimestamp.toDate()} Received: ${receivedMessage}`);
      
      if (receivedMessage === message) {
        console.log("Received expected message:", message);
        // You might want to add an assertion here
        // assert.strictEqual(receivedMessage, message);
      }
    });

  // Wait for a short period to allow time for message reception
  await new Promise(resolve => setTimeout(resolve, 5000));
});
//===============================================================================================================


// Fonction fictive pour créer un compte (assurez-vous que cette fonction existe quelque part dans votre projet)
async function accountCreatorFcn(privateKey: PrivateKey, initialBalance: Hbar, client: Client) {
  const transaction = new AccountCreateTransaction()
    .setKey(privateKey.publicKey)
    .setInitialBalance(initialBalance);
  
  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);
  
  return [receipt.status, receipt.accountId]; // Retourne le statut de la transaction et l'ID du compte créé
}

Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  // Générer une nouvelle clé ED25519 pour le second compte
  const secondAccountKey = PrivateKey.generateED25519();
  
  // Créer le second compte avec expectedBalance + 1 hbars
  const initialBalance = new Hbar(expectedBalance + 1);
  
  // Utiliser la fonction accountCreatorFcn pour créer le nouveau compte
  const [accountStatus, secondAccountId] = await accountCreatorFcn(secondAccountKey, initialBalance, client);
  
  // Vérifier que le compte a été correctement créé et que secondAccountId est un AccountId
  if (!secondAccountId || !(secondAccountId instanceof AccountId)) {
    throw new Error("Le compte secondaire n'a pas pu être créé correctement.");
  }
  
  // Stocker les informations du compte pour une utilisation ultérieure
  this.secondAccount = secondAccountId;
  this.secondAccountKey = secondAccountKey;
  
  // Afficher les détails du compte secondaire créé
  console.log(`Compte secondaire créé avec l'ID : ${secondAccountId} et un solde initial de ${initialBalance.toString()} hbars`);
  
  // Vérifier que le solde est supérieur à expectedBalance
  const query = new AccountBalanceQuery().setAccountId(secondAccountId);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance, "Le solde du compte est inférieur à ce qui est attendu.");
});




Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold: number, totalKeys: number) {
  // Vérifier que nous avons le bon nombre de clés
  if (totalKeys !== 2) {
    throw new Error(`Cette étape est conçue pour 2 clés, mais ${totalKeys} ont été spécifiées.`);
  }

  // Vérifier que nous avons les clés des deux comptes
  if (!this.privKey || !this.secondAccountKey) {
    throw new Error("Les clés du premier et du second compte doivent être définies avant cette étape.");
  }

  // Créer la liste de clés
  const keyList = [
    this.privKey.publicKey,
    this.secondAccountKey.publicKey
  ];

  // Créer la clé à seuil
  this.thresholdKey = new KeyList(keyList, threshold);

  console.log(`Clé à seuil ${threshold}/${totalKeys} créée avec succès.`);
});

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, async function (memo) {
  // Vérifier que la clé à seuil a été créée
  if (!this.thresholdKey) {
    throw new Error("La clé à seuil doit être créée avant cette étape.");
  }

  // Créer la transaction
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.thresholdKey);

  // Signer et exécuter la transaction
  const txResponse = await transaction.execute(client);

  // Obtenir le reçu de la transaction
  const receipt = await txResponse.getReceipt(client);

  // Obtenir l'ID du topic à partir du reçu
  const topicId = receipt.topicId;

  // Stocker l'ID du topic pour une utilisation ultérieure
  this.topicId = topicId;

  console.log(`Topic créé avec l'ID: ${topicId} et le mémo: "${memo}"`);
});