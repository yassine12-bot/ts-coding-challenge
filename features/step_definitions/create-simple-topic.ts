import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction, 
  TopicInfoQuery,
  TopicMessageQuery, 
  TopicMessageSubmitTransaction,
  KeyList
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";

const client = Client.forTestnet();

async function findAccountWithBalance(minBalance: number) {
  for (const acc of accounts) {
    const accountId = AccountId.fromString(acc.id);
    const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);
    const balance = await balanceQuery.execute(client);
    if (balance.hbars.toBigNumber().toNumber() > minBalance) {
      return { accountId, privateKey: PrivateKey.fromStringED25519(acc.privateKey) };
    }
  }
  throw new Error("No account found with sufficient balance");
}

Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const { accountId, privateKey } = await findAccountWithBalance(expectedBalance);
  this.account = accountId;
  this.privKey = privateKey;
  client.setOperator(this.account, this.privKey);
});

Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const { accountId, privateKey } = await findAccountWithBalance(expectedBalance);
  this.secondAccount = accountId;
  this.secondPrivKey = privateKey;
});

Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, function (threshold: number, total: number) {
  this.thresholdKeys = new KeyList([this.privKey.publicKey, this.secondPrivKey.publicKey], threshold);
});

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  const transaction = await new TopicCreateTransaction()
    .setSubmitKey(this.privKey.publicKey)
    .setTopicMemo(memo)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  this.topicId = receipt.topicId;
  assert.ok(this.topicId, "Topic ID should not be null");
});

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, async function (memo: string) {
  const transaction = await new TopicCreateTransaction()
    .setSubmitKey(this.thresholdKeys)
    .setTopicMemo(memo)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  this.topicId = receipt.topicId;
  assert.ok(this.topicId, "Topic ID should not be null");
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const transaction = await new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message)
    .execute(client);
  await transaction.getReceipt(client);
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (message: string) {
  new TopicMessageQuery()
    .setTopicId(this.topicId)
    .subscribe(client, null, (msg) => {
      if (msg) {
        assert.strictEqual(msg.contents.toString(), message, "Received message does not match");
        console.log(`Received message: ${msg.contents.toString()}`);
      }
    });
});
