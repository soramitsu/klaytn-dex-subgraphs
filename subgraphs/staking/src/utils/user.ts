import { Address, ethereum } from "@graphprotocol/graph-ts";
import { User, Transaction } from "../../generated/schema";
import { ZERO_BI } from "./index"

export function getOrCreateUser(poolAddress: Address, address: Address): User {
  const id = poolAddress.toHex() + "-" + address.toHex();

  let user = User.load(id);

  if (user === null) {
    user = new User(id);
    user.address = address;
    user.pool = poolAddress.toHex();
    user.amount = ZERO_BI;
    user.harvested = ZERO_BI;
    user.rewardDebt = ZERO_BI;
    user.save();
  }

  return user as User;
}

export function getOrCreateHistory(event: ethereum.Event, user: User): Transaction {
  let transaction = Transaction.load(event.transaction.hash.toHex());

  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHex());
    transaction.user = user.id;
    transaction.type = "unknown";
    transaction.amount = ZERO_BI;
    transaction.harvested = ZERO_BI;
    transaction.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.save();
  }

  return transaction as Transaction;
}