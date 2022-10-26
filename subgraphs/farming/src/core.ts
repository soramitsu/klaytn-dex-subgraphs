/* eslint-disable @typescript-eslint/no-unused-vars */
import { log } from "@graphprotocol/graph-ts";
import {
    AddPool,
    Deposit,
    EmergencyWithdraw,
    SetPool,
    UpdatePool,
    Withdraw,
    UpdateRewardPerBlock,
    UpdatePoolMultiplier,
} from "../generated/Farming/Farming";
import { getOrCreateFarming } from "./farmingUpdates";
import { getOrCreatePool } from "./poolUpdates";
import { getOrCreateUser, getOrCreateHistory } from "./userUpdates";
import { ACC_PRECISION, BI_ONE, BI_ZERO } from "./utils";

export function handleAddPool(event: AddPool): void {
    log.info("[Farming] Add Pool {} {} {} {}", [
        event.params.pid.toString(),
        event.params.allocPoint.toString(),
        event.params.token.toHex(),
        event.params.bonusMultiplier.toString(),
        event.params.bonusEndBlock.toString()
    ]);

    const farming = getOrCreateFarming(event.block);
    const pool = getOrCreatePool(event.params.pid, event.block);

    pool.pair = event.params.token;
    pool.allocPoint = event.params.allocPoint;
    pool.bonusMultiplier = event.params.bonusMultiplier;
    pool.bonusEndBlock = event.params.bonusEndBlock;
    pool.save();

    farming.totalAllocPoint = farming.totalAllocPoint.plus(pool.allocPoint);
    farming.poolCount = farming.poolCount.plus(BI_ONE);
    farming.save();
}

export function handleSetPool(event: SetPool): void {
    log.info("[Farming] ˝Set Pool {} {}", [event.params.pid.toString(), event.params.allocPoint.toString()]);

    const farming = getOrCreateFarming(event.block);
    const pool = getOrCreatePool(event.params.pid, event.block);

    farming.totalAllocPoint = farming.totalAllocPoint.plus(
        event.params.allocPoint.minus(pool.allocPoint)
    );

    farming.save();

    pool.allocPoint = event.params.allocPoint;
    pool.save();
}

export function handleUpdatePool(event: UpdatePool): void {
    log.info("[Farming] Update Pool {} {} {} {}", [
        event.params.pid.toString(),
        event.params.lastRewardBlock.toString(),
        event.params.lpSupply.toString(),
        event.params.accPtnPerShare.toString(),
    ]);

    const pool = getOrCreatePool(event.params.pid, event.block);

    pool.accPtnPerShare = event.params.accPtnPerShare;
    pool.lastRewardBlock = event.params.lastRewardBlock;
    pool.save();
}

export function handleDeposit(event: Deposit): void {
    log.info("[Farming] Log Deposit {} {} {}", [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
    ]);

    const pool = getOrCreatePool(event.params.pid, event.block);
    const user = getOrCreateUser(event.params.user, pool, event.block);
    let transaction = getOrCreateHistory(event, user);
    transaction.amount = event.params.amount;
    transaction.type = event.params.amount.gt(BI_ZERO) ? "deposit" : "harvest";
    pool.totalTokensStaked = pool.totalTokensStaked.plus(event.params.amount);
    if (event.block.number.gt(pool.createdAtBlock) && user.amount.gt(BI_ZERO)) {
        const pending = user.amount
          .times(pool.accPtnPerShare)
          .div(ACC_PRECISION)
          .minus(user.rewardDebt)
        log.info('Deposit: User amount is more than zero, we should harvest {} ptn - block: {}', [
          pending.toString(),
          event.block.number.toString(),
        ])
        if (pending.gt(BI_ZERO)) {
          user.harvested = user.harvested.plus(pending)
          pool.harvested = pool.harvested.plus(pending)
          transaction.harvested = pending;
        }
    }
    user.amount = user.amount.plus(event.params.amount);
    user.rewardDebt = user.amount
        .times(pool.accPtnPerShare)
        .div(ACC_PRECISION);
    transaction.save();
    pool.save();
    user.save();
}

export function handleWithdraw(event: Withdraw): void {
    log.info("[Farming] Log Withdraw {} {} {}", [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
    ]);

    const pool = getOrCreatePool(event.params.pid, event.block);
    const user = getOrCreateUser(event.params.user, pool, event.block);
    let transaction = getOrCreateHistory(event, user);
    transaction.amount = event.params.amount;
    transaction.type = event.params.amount.gt(BI_ZERO) ? "withdraw" : "harvest";
    pool.totalTokensStaked = pool.totalTokensStaked.minus(event.params.amount);
    if (event.block.number.gt(pool.createdAtBlock) && user.amount.gt(BI_ZERO)) {
        const pending = user.amount
          .times(pool.accPtnPerShare)
          .div(ACC_PRECISION)
          .minus(user.rewardDebt)
        log.info('Withdraw: User amount is more than zero, we should harvest {} ptn - block: {}', [
          pending.toString(),
          event.block.number.toString(),
        ])
        if (pending.gt(BI_ZERO)) {
          user.harvested = user.harvested.plus(pending)
          pool.harvested = pool.harvested.plus(pending)
          transaction.harvested = pending;
        }
    }
    user.amount = user.amount.minus(event.params.amount);

    if (user.amount.equals(BI_ZERO)) {
        pool.userCount = pool.userCount.minus(BI_ONE);
    }

    user.rewardDebt = user.amount
        .times(pool.accPtnPerShare)
        .div(ACC_PRECISION);
    transaction.save();
    pool.save();
    user.save();
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
    log.info("[Farming] Log Emergency Withdraw {} {} {}", [
        event.params.user.toHex(),
        event.params.pid.toString(),
        event.params.amount.toString(),
    ]);

    const pool = getOrCreatePool(event.params.pid, event.block);
    const user = getOrCreateUser(event.params.user, pool, event.block);
    let transaction = getOrCreateHistory(event, user);
    transaction.amount = event.params.amount;
    transaction.type = "emergencyWithdraw";
    transaction.save();
    user.amount = BI_ZERO;
    user.rewardDebt = BI_ZERO;
    pool.userCount = pool.userCount.minus(BI_ONE);
    user.save();
}

export function handleUpdateRewardPerBlock(event: UpdateRewardPerBlock): void {
    log.info("[Farming] Update Reward Rate {} {} {}", [
        event.params.rewardPerBlock.toString(),
    ]);

    const farming = getOrCreateFarming(event.block);
    farming.rewardRate = event.params.rewardPerBlock;
    farming.save();
}

export function handleUpdatePoolMultiplier(event: UpdatePoolMultiplier): void {
    log.info("[Farming] Update Pool Multiplier {} {} {} {}", [
        event.params.pid.toString(),
        event.params.multiplier.toString(),
    ]);

    const pool = getOrCreatePool(event.params.pid, event.block);
    pool.bonusMultiplier = event.params.multiplier;
    pool.save();
}