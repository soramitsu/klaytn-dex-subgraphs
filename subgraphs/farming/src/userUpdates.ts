/* eslint-disable @typescript-eslint/no-unused-vars */
import { Pool, User, Transaction } from "../generated/schema";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BI_ZERO, BI_ONE } from "./utils";

export function getOrCreateUser(address: Address, pool: Pool, block: ethereum.Block): User {
  const uid = address.toHex();
  const id = pool.id.concat("-").concat(uid);
  let user = User.load(id);

  if (user === null) {
    user = new User(id);
    user.address = address;
    user.pool = pool.id;
    user.amount = BI_ZERO;
    user.rewardDebt = BI_ZERO;
    user.harvested = BI_ZERO;
    pool.userCount = pool.userCount.plus(BI_ONE);
    pool.totalUsersCount = pool.totalUsersCount.plus(BI_ONE);
    pool.save();
  }
  user.updatedAtTimestamp = block.timestamp;
  user.updatedAtBlock = block.number;
  user.save();
  return user;
}

export function getOrCreateHistory(event: ethereum.Event, user: User): Transaction {
  let transaction = Transaction.load(event.transaction.hash.toHex());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHex());
    transaction.user = user.id;
    transaction.pool = user.pool;
    transaction.type = "unknown";
    transaction.amount = BI_ZERO;
    transaction.harvested = BI_ZERO;
    transaction.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.save();
  }
  return transaction as Transaction;
}