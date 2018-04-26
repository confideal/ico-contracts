const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const txStatus = require('./helpers/txStatus');
const decodeLogs = require('./helpers/decodeLogs');

const Campaign = artifacts.require('Campaign');
const CampaignLib = artifacts.require('CampaignLib');
const Token = artifacts.require('Token');
const BillingMock = artifacts.require('BillingMock');

const WHITEPAPER_HASH = '0xc15a0175e131a752d83e216abc4e4ff3377278f83d50c0bec9bc3460e68696d6';

const TIME_MODE_BLOCK = 0;
const TIME_MODE_TIMESTAMP = 1;

const BONUS_MODE_FLAT = 0;
const BONUS_MODE_BLOCK = 1;
const BONUS_MODE_TIMESTAMP = 2;
const BONUS_MODE_AMOUNT_RAISED = 3;
const BONUS_MODE_CONTRIBUTION_AMOUNT = 4;

const STAGE_INIT = 0;
const STAGE_READY = 1;
const STAGE_IN_PROGRESS = 2;
const STAGE_FAILURE = 3;
const STAGE_SUCCESS = 4;

const GAS_CONTRIBUTION = 170000;
const GAS_REFUND = 70000;

contract('Campaign', function (accounts) {
    const currentTimestamp = () => Math.floor(new Date / 1000);
    const currentBlock = () => web3.eth.blockNumber;

    const beneficiary = accounts[1];

    const createCampaign = (modifier) => {
        let params = {
            id: 'cnfdl',
            beneficiary: beneficiary,
            name: 'Confideal Campaign',
            website: 'https://confideal.io',
            whitePaperHash: '0xc15a0175e131a752d83e216abc4e4ff3377278f83d50c0bec9bc3460e68696d6',
            fundingThreshold: 100,
            fundingGoal: 300,
            tokenPrice: web3.toWei(0.3),
            startTime: currentTimestamp() + 1000,
            finishTime: currentTimestamp() + 2000,
            timeMode: TIME_MODE_TIMESTAMP,
            bonusMode: BONUS_MODE_FLAT,
            bonusLevels: [],
            bonusRates: [],
        };
        if (modifier) {
            params = Object.assign(params, modifier);
        }
        return Campaign.new(
            params.id,
            params.beneficiary,
            params.name,
            params.website,
            params.whitePaperHash,
            [
                params.fundingThreshold,
                params.fundingGoal,
                params.tokenPrice,
                params.startTime,
                params.finishTime,
                params.timeMode,
                params.bonusMode
            ],
            params.bonusLevels,
            params.bonusRates,
        );
    };

    const setBilling = campaign => BillingMock.new()
        .then(billing => campaign.setBilling(billing.address, '')
            .then(() => billing)
        );

    const createToken = (campaign, modifier, txParams = {}) => {
        let params = {
            name: 'Confideal Token',
            symbol: 'CDL',
            decimals: 18,
            distributionRecipients: [accounts[0], accounts[1]],
            distributionAmounts: [1, 2],
            releaseTimes: [0, 1]

        };
        if (modifier) {
            params = Object.assign(params, modifier);
        }
        return campaign.createToken(
            params.name,
            params.symbol,
            params.decimals,
            params.distributionRecipients,
            params.distributionAmounts,
            params.releaseTimes,
            txParams
        );
    };

    describe('constructor', () => {
        it('should create a campaign', () => {
            const blockNumber = currentBlock() + 1;
            return Campaign.new(
                'cnfdl',
                beneficiary,
                'Confideal Campaign',
                'https://confideal.io',
                WHITEPAPER_HASH,
                [1, 2, 3, blockNumber + 1, blockNumber + 2, TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                [10, 20],
                [1, 2]
            ).then(campaign => Promise.all([
                campaign.id.call().then(id => id.should.be.equal('cnfdl')),
                campaign.beneficiary.call().then(actualBeneficiary => actualBeneficiary.should.be.equal(beneficiary)),
                campaign.name.call().then(name => name.should.be.equal('Confideal Campaign')),
                campaign.website.call().then(website => website.should.be.equal('https://confideal.io')),
                campaign.whitePaperHash.call().then(whitePaperHash => whitePaperHash.should.be.equal(WHITEPAPER_HASH)),
                campaign.fundingThreshold.call().then(fundingThreshold => fundingThreshold.toString().should.be.equal('1')),
                campaign.fundingGoal.call().then(fundingGoal => fundingGoal.toString().should.be.equal('2')),
                campaign.tokenPrice.call().then(tokenPrice => tokenPrice.toString().should.be.equal('3')),
                campaign.timeMode.call().then(timeMode => timeMode.toNumber().should.be.equal(TIME_MODE_BLOCK)),
                campaign.startTime.call().then(startTime => startTime.toNumber().should.be.equal(blockNumber + 1)),
                campaign.finishTime.call().then(finishTime => finishTime.toNumber().should.be.equal(blockNumber + 2)),
                campaign.bonusMode.call().then(bonusMode => bonusMode.toNumber().should.be.equal(BONUS_MODE_AMOUNT_RAISED)),
                campaign.bonusLevels.call(0).then(bonusLevel => bonusLevel.toString().should.be.equal('10')),
                campaign.bonusLevels.call(1).then(bonusLevel => bonusLevel.toString().should.be.equal('20')),
                campaign.bonusRates.call(0).then(bonusRate => bonusRate.toString().should.be.equal('1')),
                campaign.bonusRates.call(1).then(bonusRate => bonusRate.toString().should.be.equal('2')),
            ]));
        });

        it('shouldn’t allow funding threshold to be 0', () => {
            return createCampaign({
                fundingThreshold: 0,
            }).should.be.rejected;
        });

        it('shouldn’t allow to set funding threshold greater than goal', () => {
            return createCampaign({
                fundingThreshold: 2,
                fundingGoal: 1,
            }).should.be.rejected;
        });

        it('shouldn’t allow to set finish earlier than start', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 2,
                finishTime: blockNumber + 1,
            }).should.be.rejected;
        });

        it('shouldn’t allow to set start earlier than the current timestamp in the timestamp time mode', () => {
            const timestamp = currentTimestamp();
            return createCampaign({
                timeMode: TIME_MODE_TIMESTAMP,
                startTime: timestamp - 10,
                finishTime: timestamp + 2,
            }).should.be.rejected;
        });

        it('shouldn’t allow to set start earlier than the current block in the block time mode', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber - 1,
                finishTime: blockNumber + 2,
            }).should.be.rejected;
        });

        it('should require the bonus level and rate arrays to have the same length', () => {
            return createCampaign({
                bonusLevels: [10, 20],
                bonusRates: [1, 2, 3],
            }).should.be.rejected;
        });
    });


    describe('billing interaction', () => {
        it('should send prepayment to the billing contract', () => {
            return createCampaign()
                .then(campaign => BillingMock.new()
                    .then(billing => campaign.setBilling(billing.address, 'PROMO CODE', {value: 10})
                        .then(() => billing.callsCount.call())
                        .then(callsCount => callsCount.toString().should.be.equal('1'))

                        .then(() => billing.calls.call(0))
                        .then(call => {
                            call[0].should.be.equal('collectPrepayment');
                            call[1].should.be.equal('PROMO CODE');
                            call[2].toString().should.be.equal('10');
                        })
                    )
                );
        });

        it('should register for post payment if no value passed during the billing setup', () => {
            return createCampaign()
                .then(campaign => BillingMock.new()
                    .then(billing => campaign.setBilling(billing.address, 'PROMO CODE')
                        .then(() => billing.callsCount.call())
                        .then(callsCount => callsCount.toString().should.be.equal('1'))

                        .then(() => billing.calls.call(0))
                        .then(call => {
                            call[0].should.be.equal('register');
                            call[1].should.be.equal('PROMO CODE');
                        })
                    )
                );
        });

        it('should pay post payment on payout withdrawal', () => {
            const blockNumber = currentBlock() + 1;
            let balanceBeforeWithdrawal;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => BillingMock.new()
                    .then(billing => campaign.setBilling(billing.address, 'PROMO CODE')

                        .then(() => createToken(campaign))

                        .then(() => campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 200,
                            gas: GAS_CONTRIBUTION
                        }))

                        .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                        .then(() => campaign.releaseTokens({from: accounts[2]}))
                        .then(txStatus.success)

                        .then(() => billing.setPostPayment(123))

                        .then(() => balanceBeforeWithdrawal = web3.eth.getBalance(beneficiary))
                        .then(() => campaign.withdrawPayout({from: beneficiary}))
                        .then((tx) => {
                            const paidForGas = web3.eth.getTransaction(tx.tx).gasPrice.mul(tx.receipt.gasUsed);
                            const balanceAfterWithdrawal = web3.eth.getBalance(beneficiary);
                            // balanceAfterWithdrawal - balanceBeforeWithdrawal + paidForGas
                            balanceAfterWithdrawal.sub(balanceBeforeWithdrawal).add(paidForGas).toString().should.be.equal('77'); // 200 - 123

                            const campaignLogs = decodeLogs(CampaignLib, tx.receipt.logs);
                            campaignLogs.should.have.length(1);
                            campaignLogs[0].event.should.be.equal('Payout');
                            campaignLogs[0].args.recipient.should.be.equal(beneficiary);
                            campaignLogs[0].args.amount.toString().should.be.equal('77');
                        })

                        .then(() => billing.callsCount.call())
                        .then(callsCount => callsCount.toString().should.be.equal('2'))

                        .then(() => billing.calls.call(1))
                        .then(call => {
                            call[0].should.be.equal('collectPostPayment');
                            call[2].toString().should.be.equal('123');
                        })
                    )
                );
        });

        it('shouldn’t allow non-owner to set the billing contract', () => {
            return createCampaign()
                .then(campaign => BillingMock.new()
                    .then(billing => campaign.setBilling(billing.address, '', {from: accounts[1]})
                        .catch(txStatus.fail)
                    )
                )
        });
    });

    describe('stage', () => {
        it('should be “init” while setting up', () => {
            return createCampaign()
                .then(campaign => campaign.stage.call())
                .then(stage => stage.toNumber().should.be.equal(STAGE_INIT));
        });

        it('should be “ready” before start', () => {
            return createCampaign()
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_READY))
                );
        });

        it('should be “in progress” between start and finish or early success', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 3,
                finishTime: blockNumber + 100,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_IN_PROGRESS))
                );
        });

        it('should be “failure” after finish if the amount raised didn’t reach the threshold', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 3,
                finishTime: blockNumber + 4,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_FAILURE))
                );
        });

        it('should be “success” after finish if the amount raised reached the threshold', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.sendTransaction({
                        from: accounts[1],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_SUCCESS))
                );
        });

        it('should be “success” if the amount raised reached the goal even before finish', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 100,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.sendTransaction({
                        from: accounts[1],
                        to: campaign.address,
                        value: 300,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_SUCCESS))
                );
        });
    });

    describe('token contract creation', () => {
        it('should create a token contract', () => {
            return createCampaign()
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call())
                    .then((tokenAddress) => {
                        const token = Token.at(tokenAddress);
                        return Promise.all([
                            token.name.call().then(name => name.should.be.equal('Confideal Token')),
                            token.symbol.call().then(tokenSymbol => tokenSymbol.should.be.equal('CDL')),
                            token.decimals.call().then(decimals => decimals.toString().should.be.equal('18')),
                            token.balanceOf.call(accounts[0]).then(balance => balance.toString().should.be.equal('1')),
                            token.balanceOf.call(accounts[1]).then(balance => balance.toString().should.be.equal('2')),
                            token.releaseTimes.call(accounts[0]).then(time => time.toString().should.be.equal('0')),
                            token.releaseTimes.call(accounts[1]).then(time => time.toString().should.be.equal('1')),
                            token.timeMode.call().then(mode => mode.toNumber().should.be.equal(TIME_MODE_TIMESTAMP)),
                        ]);
                    }));
        });

        it('shouldn’t allow to create a token contract without billing', () => {
            return createCampaign()
                .then(campaign => createToken(campaign))
                .catch(txStatus.fail);
        });

        it('shouldn’t allow to create a token contract twice', () => {
            return createCampaign()
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(txStatus.success)
                    .then(() => createToken(campaign))
                    .catch(txStatus.fail)
                )
        });

        it('shouldn’t allow non-owner to create a token contract', () => {
            return createCampaign()
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign, null, {from: accounts[1]}))
                    .catch(txStatus.fail)
                )
        });
    });

    describe('minimal contribution', () => {
        it('should be limited by the token price', () => {
            return createCampaign({
                tokenPrice: web3.toWei(3),
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign, {
                        decimals: 18,
                    }))
                    .then(() => campaign.minContribution.call())
                    .then(minContribution => minContribution.toString().should.be.equal('3'))
                );
        });

        it('should be limited by the token decimals count', () => {
            return createCampaign({
                tokenPrice: web3.toWei(0.3),
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign, {
                        decimals: 15,
                    }))
                    .then(() => campaign.minContribution.call())
                    .then(minContribution => minContribution.toString().should.be.equal('300'))
                );
        });

        it('should be at least 1 wei', () => {
            return createCampaign({
                tokenPrice: web3.toWei(0.3),
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign, {
                        decimals: 18,
                    }))
                    .then(() => campaign.minContribution.call())
                    .then(minContribution => minContribution.toString().should.be.equal('1'))
                );
        });
    });

    describe('contribution', () => {
        it('should receive ether and mint tokens', () => {
            const blockNumber = currentBlock() + 1;
            let token;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 100,
                bonusMode: BONUS_MODE_FLAT,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 10,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then((tx) => {
                        web3.eth.getBalance(campaign.address).toString().should.be.equal('10');
                        const campaignLogs = decodeLogs(CampaignLib, tx.receipt.logs);
                        campaignLogs.should.have.length(1);
                        campaignLogs[0].event.should.be.equal('Contribution');
                        campaignLogs[0].args.sender.should.be.equal(accounts[5]);
                        campaignLogs[0].args.amount.toString().should.be.equal('10');
                    })
                    .then(() => campaign.contributions.call(accounts[5]))
                    .then(contribution => contribution.toString().should.be.equal('10'))
                    .then(() => token.balanceOf.call(accounts[5]))
                    .then(balance => balance.toString().should.be.equal('33'))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 20,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(() => campaign.contributions.call(accounts[5]))
                    .then(contribution => contribution.toString().should.be.equal('30'))
                    .then(() => token.balanceOf.call(accounts[5]))
                    .then(balance => balance.toString().should.be.equal('99'))

                    .then(() => campaign.sendTransaction({
                        from: accounts[6],
                        to: campaign.address,
                        value: 60,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(() => campaign.contributions.call(accounts[6]))
                    .then(contribution => contribution.toString().should.be.equal('60'))
                    .then(() => token.balanceOf.call(accounts[6]))
                    .then(balance => balance.toString().should.be.equal('200'))

                    .then(() => web3.eth.getBalance(campaign.address).toString().should.be.equal('90'))
                );
        });

        it('shouldn’t allow to contribute before the campaign start', () => {
            return createCampaign()
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 10,
                        gas: GAS_CONTRIBUTION
                    }))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow to contribute after the campaign finish', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 1,
                finishTime: blockNumber + 2,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(txStatus.success)
                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 10,
                        gas: GAS_CONTRIBUTION
                    }))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow to contribute less than the minimal contribution amount', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                tokenPrice: web3.toWei(3),
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 100,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(txStatus.success)

                    .then(() => campaign.minContribution.call())
                    .then(minContribution => minContribution.toString().should.be.equal('3'))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 3,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 1,
                        gas: GAS_CONTRIBUTION
                    }))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow to contribute more than the funding goal', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 100,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 301,
                        gas: GAS_CONTRIBUTION
                    }))
                    .catch(txStatus.fail)

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 300,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)
                );
        });

        it('should release tokens on early success', () => {
            const blockNumber = currentBlock() + 1;
            let token;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 100,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 300,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then((tx) => {
                        const campaignLogs = decodeLogs(CampaignLib, tx.receipt.logs);
                        campaignLogs.should.have.length(2);
                        campaignLogs[1].event.should.be.equal('EarlySuccess');

                        return Promise.all([
                            campaign.earlySuccessTimestamp.call()
                                .then(timestamp => timestamp.toNumber()
                                    .should.be.equal(web3.eth.getBlock(tx.receipt.blockHash).timestamp)),
                            campaign.earlySuccessBlock.call()
                                .then(block => block.toNumber().should.be.equal(tx.receipt.blockNumber)),
                            token.mintingFinished.call()
                                .then(mintingFinished => mintingFinished.should.be.true),
                        ]);
                    })
                );
        });

        describe('bonus calculation', () => {
            it('should calculate bonus depending on the bonus level in the block mode', () => {
                const blockNumber = currentBlock() + 1;
                let token;
                return createCampaign({
                    tokenPrice: web3.toWei(1),
                    timeMode: TIME_MODE_BLOCK,
                    startTime: blockNumber + 3,
                    finishTime: blockNumber + 100,
                    bonusMode: BONUS_MODE_BLOCK,
                    bonusLevels: [blockNumber + 4, blockNumber + 5],
                    bonusRates: [web3.toWei(1.2), web3.toWei(1.1)],
                })
                    .then(campaign => setBilling(campaign)
                        .then(() => createToken(campaign))
                        .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                        .then(() => campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[5]))
                        .then(balance => balance.toString().should.be.equal('12'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[6]))
                        .then(balance => balance.toString().should.be.equal('11'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[7],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[7]))
                        .then(balance => balance.toString().should.be.equal('10'))
                    );
            });

            it('should calculate bonus depending on the bonus level in the timestamp mode', () => {
                const timestamp = currentTimestamp();
                const blockNumber = currentBlock() + 1;
                const snapshotId = web3.currentProvider.send({method: 'evm_snapshot'});
                let token;
                return createCampaign({
                    tokenPrice: web3.toWei(1),
                    timeMode: TIME_MODE_BLOCK,
                    startTime: blockNumber + 3,
                    finishTime: blockNumber + 100,
                    bonusMode: BONUS_MODE_TIMESTAMP,
                    bonusLevels: [timestamp + 1000, timestamp + 2000],
                    bonusRates: [web3.toWei(1.2), web3.toWei(1.1)],
                })
                    .then(campaign => setBilling(campaign)
                        .then(() => createToken(campaign))
                        .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                        .then(() => campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[5]))
                        .then(balance => balance.toString().should.be.equal('12'))

                        .then(() => web3.currentProvider.send({method: 'evm_increaseTime', params: [1001]}))
                        .then(() => campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[6]))
                        .then(balance => balance.toString().should.be.equal('11'))

                        .then(() => web3.currentProvider.send({method: 'evm_increaseTime', params: [1001]}))
                        .then(() => campaign.sendTransaction({
                            from: accounts[7],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[7]))
                        .then(balance => balance.toString().should.be.equal('10'))
                    )
                    // Revert timestamp (unfortunately, doesn’t work)
                    // https://github.com/trufflesuite/ganache-core/issues/7
                    // https://github.com/trufflesuite/ganache-cli/issues/390
                    .then(() => web3.currentProvider.send({method: 'evm_revert', params: [snapshotId]}))
                    .catch((reason) => {
                        web3.currentProvider.send({method: 'evm_revert', params: [snapshotId]});
                        throw reason;
                    });
            });

            it('should calculate bonus depending on the bonus level in the amount raised mode', () => {
                const blockNumber = currentBlock() + 1;
                let token;
                return createCampaign({
                    tokenPrice: web3.toWei(1),
                    timeMode: TIME_MODE_BLOCK,
                    startTime: blockNumber + 3,
                    finishTime: blockNumber + 100,
                    bonusMode: BONUS_MODE_AMOUNT_RAISED,
                    bonusLevels: [10, 20, 30],
                    bonusRates: [web3.toWei(1.3), web3.toWei(1.2), web3.toWei(1.1)],
                })
                    .then(campaign => setBilling(campaign)
                        .then(() => createToken(campaign))
                        .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                        .then(() => campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[5]))
                        .then(balance => balance.toString().should.be.equal('13'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: 5,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[6]))
                        .then(balance => balance.toString().should.be.equal('6'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[7],
                            to: campaign.address,
                            value: 16,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[7]))
                        .then(balance => balance.toString().should.be.equal('18'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[8],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[8]))
                        .then(balance => balance.toString().should.be.equal('10'))
                    );
            });

            it('should calculate bonus depending on the bonus level in the contribution amount mode', () => {
                const blockNumber = currentBlock() + 1;
                let token;
                return createCampaign({
                    tokenPrice: web3.toWei(1),
                    timeMode: TIME_MODE_BLOCK,
                    startTime: blockNumber + 3,
                    finishTime: blockNumber + 100,
                    bonusMode: BONUS_MODE_CONTRIBUTION_AMOUNT,
                    bonusLevels: [10, 20, 300],
                    bonusRates: [web3.toWei(1), web3.toWei(1.1), web3.toWei(1.2)],
                })
                    .then(campaign => setBilling(campaign)
                        .then(() => createToken(campaign))
                        .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                        .then(() => campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 10,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[5]))
                        .then(balance => balance.toString().should.be.equal('10'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: 11,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[6]))
                        .then(balance => balance.toString().should.be.equal('12'))

                        .then(() => campaign.sendTransaction({
                            from: accounts[7],
                            to: campaign.address,
                            value: 21,
                            gas: GAS_CONTRIBUTION
                        }))
                        .then(() => token.balanceOf.call(accounts[7]))
                        .then(balance => balance.toString().should.be.equal('25'))
                    );
            });
        });
    });

    describe('release of tokens', () => {
        it('should allow to release tokens when the campaign is finished successful', () => {
            const blockNumber = currentBlock() + 1;
            let token;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => campaign.releaseTokens({from: accounts[2]}))

                    .then(() => token.mintingFinished.call())
                    .then(mintingFinished => mintingFinished.should.be.true)
                );
        });

        it('shouldn’t allow to release already released tokens', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => campaign.releaseTokens({from: accounts[2]}))
                    .then(txStatus.success)

                    .then(() => campaign.releaseTokens({from: accounts[2]}))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow to release tokens if campaign failed', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 3,
                finishTime: blockNumber + 4,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 4)) // Campaign has finished

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_FAILURE))

                    .then(() => campaign.releaseTokens({from: accounts[2]}))
                    .catch(txStatus.fail)
                );
        });
    });

    describe('payout withdrawal', () => {
        it('should withdraw payout', () => {
            const blockNumber = currentBlock() + 1;
            let balanceBeforeWithdrawal;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => campaign.releaseTokens({from: accounts[2]}))
                    .then(txStatus.success)

                    .then(() => balanceBeforeWithdrawal = web3.eth.getBalance(beneficiary))
                    .then(() => campaign.withdrawPayout({from: beneficiary}))
                    .then((tx) => {
                        const paidForGas = web3.eth.getTransaction(tx.tx).gasPrice.mul(tx.receipt.gasUsed);
                        const balanceAfterWithdrawal = web3.eth.getBalance(beneficiary);
                        // balanceAfterWithdrawal - balanceBeforeWithdrawal + paidForGas
                        balanceAfterWithdrawal.sub(balanceBeforeWithdrawal).add(paidForGas).toString().should.be.equal('100');

                        const campaignLogs = decodeLogs(CampaignLib, tx.receipt.logs);
                        campaignLogs.should.have.length(1);
                        campaignLogs[0].event.should.be.equal('Payout');
                        campaignLogs[0].args.recipient.should.be.equal(beneficiary);
                        campaignLogs[0].args.amount.toString().should.be.equal('100');
                    })
                );
        });

        it('should release tokens if not released yet', () => {
            const blockNumber = currentBlock() + 1;
            let token;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => token.mintingFinished.call())
                    .then(mintingFinished => mintingFinished.should.be.false)

                    .then(() => campaign.withdrawPayout({from: beneficiary}))

                    .then(() => token.mintingFinished.call())
                    .then(mintingFinished => mintingFinished.should.be.true)
                );
        });

        it('shouldn’t allow to withdraw payout if campaign isn’t successful', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 33,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_FAILURE))

                    .then(() => campaign.withdrawPayout({from: beneficiary}))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow non-beneficiary to withdraw payout', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => (currentBlock() + 1).should.be.at.least(blockNumber + 5)) // Campaign has finished

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_SUCCESS))

                    .then(() => campaign.withdrawPayout({from: accounts[3]}))
                    .catch(txStatus.fail)
                );
        });
    });

    describe('refund withdrawal', () => {
        it('should allow to withdraw refund', () => {
            const blockNumber = currentBlock() + 1;
            let balanceBeforeWithdrawal;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 6,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 33,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => campaign.sendTransaction({
                        from: accounts[6],
                        to: campaign.address,
                        value: 22,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_FAILURE))

                    .then(() => balanceBeforeWithdrawal = web3.eth.getBalance(accounts[5]))
                    .then(() => campaign.withdrawRefund({from: accounts[5], gas: GAS_REFUND}))
                    .then((tx) => {
                        const paidForGas = web3.eth.getTransaction(tx.tx).gasPrice.mul(tx.receipt.gasUsed);
                        const balanceAfterWithdrawal = web3.eth.getBalance(accounts[5]);
                        // balanceAfterWithdrawal - balanceBeforeWithdrawal + paidForGas
                        balanceAfterWithdrawal.sub(balanceBeforeWithdrawal).add(paidForGas).toString().should.be.equal('33');

                        const campaignLogs = decodeLogs(CampaignLib, tx.receipt.logs);
                        campaignLogs.should.have.length(1);
                        campaignLogs[0].event.should.be.equal('Refund');
                        campaignLogs[0].args.recipient.should.be.equal(accounts[5]);
                        campaignLogs[0].args.amount.toString().should.be.equal('33');
                    })
                    .then(() => web3.eth.getBalance(campaign.address).toString().should.be.equal('22'))
                );
        });

        it('shouldn’t allow to withdraw refund if campaign isn’t failed', () => {
            const blockNumber = currentBlock() + 1;
            let token;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))
                    .then(() => campaign.token.call().then(tokenAddress => token = Token.at(tokenAddress)))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 100,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_SUCCESS))

                    .then(() => campaign.withdrawRefund({from: accounts[5], gas: GAS_REFUND}))
                    .catch(txStatus.fail)
                );
        });

        it('shouldn’t allow non-contributor to withdraw refund', () => {
            const blockNumber = currentBlock() + 1;
            return createCampaign({
                timeMode: TIME_MODE_BLOCK,
                startTime: blockNumber + 4,
                finishTime: blockNumber + 5,
            })
                .then(campaign => setBilling(campaign)
                    .then(() => createToken(campaign))

                    .then(() => campaign.sendTransaction({
                        from: accounts[5],
                        to: campaign.address,
                        value: 33,
                        gas: GAS_CONTRIBUTION
                    }))
                    .then(txStatus.success)

                    .then(() => campaign.stage.call())
                    .then(stage => stage.toNumber().should.be.equal(STAGE_FAILURE))

                    .then(() => campaign.withdrawRefund({from: accounts[6], gas: GAS_REFUND}))
                    .catch(txStatus.fail)
                );
        });
    });
});