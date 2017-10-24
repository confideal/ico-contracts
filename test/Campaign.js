const Campaign = artifacts.require('Campaign');
const Token = artifacts.require('Token');

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
    const currentTimestamp = function () {
        return Math.floor(new Date / 1000);
    };

    const currentBlock = function () {
        return Campaign.web3.eth.blockNumber;
    };

    const beneficiary = accounts[1];

    const createCampaign = function () {
        return Campaign.new(
            'cnfdl',
            beneficiary,
            'Confideal Campaign',
            'https://confideal.io',
            WHITEPAPER_HASH
        );
    };

    const setCampaignParams = function (campaign) {
        return campaign.setParams(
            [1, 2, 3, currentTimestamp() + 1000, currentTimestamp() + 2000],
            [TIME_MODE_TIMESTAMP, BONUS_MODE_AMOUNT_RAISED],
            [10, 20],
            [1, 2]
        );
    };

    const createToken = function (campaign) {
        return campaign.createToken(
            'Confideal Token',
            'CDL',
            18,
            [accounts[0], accounts[1]],
            [1, 2],
            [0, 1]
        );
    };

    it('should create a campaign', function () {
        return createCampaign().then(function (campaign) {
            return Promise.all([
                campaign.id.call().then(function (id) {
                    assert.equal(id, 'cnfdl');
                }),
                campaign.beneficiary.call().then(function (actualBeneficiary) {
                    assert.equal(actualBeneficiary, beneficiary);
                }),
                campaign.name.call().then(function (name) {
                    assert.equal(name, 'Confideal Campaign');
                }),
                campaign.website.call().then(function (website) {
                    assert.equal(website, 'https://confideal.io');
                }),
                campaign.whitePaperHash.call().then(function (whitePaperHash) {
                    assert.equal(whitePaperHash, WHITEPAPER_HASH);
                })
            ]);
        });
    });

    describe('setting campaign parameters', function () {
        it('should set campaign parameters', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [1, 2, 3, blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [10, 20],
                    [1, 2]
                )
                    .then(function () {
                        return Promise.all([
                            campaign.fundingThreshold.call().then(function (fundingThreshold) {
                                assert.equal(fundingThreshold.toString(), '1');
                            }),
                            campaign.fundingGoal.call().then(function (fundingGoal) {
                                assert.equal(fundingGoal.toString(), '2');
                            }),
                            campaign.tokenPrice.call().then(function (tokenPrice) {
                                assert.equal(tokenPrice.toString(), '3');
                            }),
                            campaign.timeMode.call().then(function (timeMode) {
                                assert.equal(timeMode.toNumber(), TIME_MODE_BLOCK);
                            }),
                            campaign.startTime.call().then(function (startTime) {
                                assert.equal(startTime.toNumber() - blockNumber, 1);
                            }),
                            campaign.finishTime.call().then(function (finishTime) {
                                assert.equal(finishTime.toNumber() - blockNumber, 2);
                            }),
                            campaign.bonusMode.call().then(function (bonusMode) {
                                assert.equal(bonusMode.toNumber(), BONUS_MODE_AMOUNT_RAISED);
                            }),
                            campaign.bonusLevels.call(0).then(function (bonusLevel) {
                                assert.equal(bonusLevel.toString(), '10');
                            }),
                            campaign.bonusLevels.call(1).then(function (bonusLevel) {
                                assert.equal(bonusLevel.toString(), '20');
                            }),
                            campaign.bonusRates.call(0).then(function (bonusRate) {
                                assert.equal(bonusRate.toString(), '1');
                            }),
                            campaign.bonusRates.call(1).then(function (bonusRate) {
                                assert.equal(bonusRate.toString(), '2');
                            })
                        ]);
                    });
            });
        });

        it('shouldn’t allow to set campaign parameters twice', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [1, 2, 3, blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [10, 20],
                    [1, 2]
                )
                    .then(function () {
                        return campaign.setParams(
                            [1, 2, 3, blockNumber + 11, blockNumber + 12],
                            [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                            [10, 20],
                            [1, 2]
                        )
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });

        it('shouldn’t allow funding threshold to be 0', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [0, 2, 3, blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    []
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('shouldn’t allow to set funding threshold greater than goal', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [2, 1, 3, blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    []
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('shouldn’t allow to set finish earlier than start', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [1, 2, 3, blockNumber + 2, blockNumber + 1],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    []
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('shouldn’t allow to set start earlier than the current timestamp in the timestamp time mode', function () {
            return createCampaign().then(function (campaign) {
                const timestamp = currentTimestamp();
                return campaign.setParams(
                    [1, 2, 3, timestamp - 10, timestamp + 2],
                    [TIME_MODE_TIMESTAMP, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    []
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('shouldn’t allow to set start earlier than the current block in the block time mode', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [1, 2, 3, blockNumber - 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    []
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('should require the bonus level and rate arrays to have equal lengths', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [1, 2, 3, blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                    [1, 2],
                    [1, 2, 3]
                )
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });
    });

    describe('stage', function () {
        it('should be “init” while setting up', function () {
            return createCampaign().then(function (campaign) {
                return campaign.stage.call().then(function (stage) {
                    assert.equal(stage.toNumber(), STAGE_INIT);
                });
            });
        });

        it('should be “ready” before start', function () {
            return createCampaign().then(function (campaign) {
                const timestamp = currentTimestamp();
                const snapshotId = Campaign.currentProvider.send({method: 'evm_snapshot'});
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(1),
                        timestamp + 100, timestamp + 1000],
                    [TIME_MODE_TIMESTAMP, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        Campaign.currentProvider.send({method: 'evm_increaseTime', params: [101]});
                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_READY);
                        });
                    })
                    // Revert timestamp
                    .then(function () {
                        Campaign.currentProvider.send({method: 'evm_revert', params: [snapshotId]});
                    })
                    .catch(function (reason) {
                        Campaign.currentProvider.send({method: 'evm_revert', params: [snapshotId]});
                        throw reason;
                    });
            });
        });

        it('should be “in progress” between start and finish or early success', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_IN_PROGRESS);
                        });
                    });
            });
        });

        it('should be “failure” after finish if the amount raised didn’t reach the threshold', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});
                        assert.isAtLeast(currentBlock(), blockNumber + 2);

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_FAILURE);
                        });
                    });
            });
        });

        it('should be “success” after finish if the amount raised reached the threshold', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[1],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        })
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});
                        assert.isAtLeast(currentBlock(), blockNumber + 3);

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_SUCCESS);
                        });
                    });
            });
        });

        it('should be “success” if the amount raised reached the goal even before finish', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(2), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 1000],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[1],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        })
                    })
                    .then(function () {
                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_SUCCESS);
                        });
                    });
            });
        });
    });

    describe('token contract creation', function () {
        it('should create a token contract', function () {
            return createCampaign().then(function (campaign) {
                return setCampaignParams(campaign)
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call();
                    })
                    .then(function (tokenAddress) {
                        const token = Token.at(tokenAddress);
                        return Promise.all([
                            token.name.call().then(function (name) {
                                assert.equal(name, 'Confideal Token');
                            }),
                            token.symbol.call().then(function (tokenSymbol) {
                                assert.equal(tokenSymbol, 'CDL');
                            }),
                            token.decimals.call().then(function (decimals) {
                                assert.equal(decimals, 18);
                            }),
                            token.balanceOf.call(accounts[0]).then(function (balance) {
                                assert.equal(balance.toString(), '1');
                            }),
                            token.balanceOf.call(accounts[1]).then(function (balance) {
                                assert.equal(balance.toString(), '2');
                            }),
                            token.releaseTimes.call(accounts[0]).then(function (balance) {
                                assert.equal(balance.toString(), '0');
                            }),
                            token.releaseTimes.call(accounts[1]).then(function (balance) {
                                assert.equal(balance.toString(), '1');
                            }),
                            token.timeMode.call().then(function (timeMode) {
                                assert.equal(timeMode, TIME_MODE_TIMESTAMP);
                            })
                        ]);
                    });
            });
        });

        it('shouldn’t allow to create a token contract if campaign params aren’t set', function () {
            return createCampaign().then(function (campaign) {
                return createToken(campaign)
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    });
            });
        });

        it('shouldn’t allow to create a token contract twice', function () {
            return createCampaign().then(function (campaign) {
                return setCampaignParams(campaign)
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return createToken(campaign)
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });

        describe('minimal contribution', () => {
            it('should be limited by the token price', function () {
                return createCampaign().then(campaign => {
                    const blockNumber = currentBlock() + 1;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(3),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                        [],
                        []
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(() => campaign.minContribution.call())
                        .then(minContribution => assert.equal(minContribution.toString(), '3'));
                });
            });

            it('should be limited by the token decimals count', function () {
                return createCampaign().then(campaign => {
                    const blockNumber = currentBlock() + 1;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(0.3),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                        [],
                        []
                    )
                        .then(() => campaign.createToken(
                            'Confideal Token',
                            'CDL',
                            15,
                            [accounts[0], accounts[1]],
                            [1, 2],
                            [0, 1]
                        ))
                        .then(() => campaign.minContribution.call())
                        .then(minContribution => assert.equal(minContribution.toString(), '300'));
                });
            });

            it('should be at least 1 wei', function () {
                return createCampaign().then(campaign => {
                    const blockNumber = currentBlock() + 1;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(0.3),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                        [],
                        []
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(() => campaign.minContribution.call())
                        .then(minContribution => assert.equal(minContribution.toString(), '1'));
                });
            });
        });
    });

    describe('contribution', function () {
        it('should receive ether and mint tokens', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 10],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function (result) {
                        assert.equal(Campaign.web3.eth.getBalance(campaign.address).toString(), Campaign.web3.toWei(1));
                        assert.equal(result.logs.length, 1);
                        assert.equal(result.logs[0].event, 'Contribution');
                        assert.equal(result.logs[0].args.sender, accounts[5]);
                        assert.equal(result.logs[0].args.amount.toString(), Campaign.web3.toWei(1));
                        return campaign.contributions.call(accounts[5]).then(function (contribution) {
                            assert.equal(contribution.toString(), Campaign.web3.toWei(1));
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        return campaign.contributions.call(accounts[5]).then(function (contribution) {
                            assert.equal(contribution.toString(), Campaign.web3.toWei(3));
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: Campaign.web3.toWei(4),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        assert.equal(Campaign.web3.eth.getBalance(campaign.address).toString(), Campaign.web3.toWei(7));
                        return Promise.all([
                            campaign.contributions.call(accounts[6]).then(function (contribution) {
                                assert.equal(contribution.toString(), Campaign.web3.toWei(4));
                            }),
                            campaign.amountRaised.call().then(function (amountRaised) {
                                assert.equal(amountRaised.toString(), Campaign.web3.toWei(7));
                            }),
                            token.balanceOf.call(accounts[5]).then(function (balance) {
                                assert.equal(balance.toString(), '9999999999999999999');
                            }),
                            token.balanceOf.call(accounts[6]).then(function (balance) {
                                assert.equal(balance.toString(), '13333333333333333333');
                            })
                        ]);
                    })
            });
        });

        it('shouldn’t allow to contribute before the campaign start', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(0.3),
                        blockNumber + 1000, blockNumber + 1010],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        })
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    })
            });
        });

        it('shouldn’t allow to contribute after the campaign finish', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        // Campaign is getting finished
                        assert.isAtLeast(currentBlock() + 1, blockNumber + 2);

                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        })
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    })
            });
        });

        it('shouldn’t allow to contribute less than the minimal contribution amount', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(3),
                        blockNumber + 1, blockNumber + 1000],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(() => campaign.minContribution.call())
                    .then(minContribution => assert.equal(minContribution.toString(), '3'))
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: 2,
                            gas: GAS_CONTRIBUTION
                        })
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    })
            });
        });

        it('shouldn’t allow to contribute more than the funding goal', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(2), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 1000],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        })
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: '1000000000000000001',
                            gas: GAS_CONTRIBUTION
                        })
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    })
            });
        });

        it('should release tokens on early success', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(2), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 1000],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        })
                    })
                    .then(function (result) {
                        assert.equal(result.logs.length, 2);
                        assert.equal(result.logs[1].event, 'EarlySuccess');

                        return Promise.all([
                            campaign.earlySuccessTimestamp.call().then(function (earlySuccessTimestamp) {
                                assert.equal(
                                    earlySuccessTimestamp.toString(),
                                    Campaign.web3.eth.getBlock(result.receipt.blockHash).timestamp
                                );
                            }),
                            campaign.earlySuccessBlock.call().then(function (earlySuccessBlock) {
                                assert.equal(earlySuccessBlock.toString(), result.receipt.blockNumber);
                            }),
                            token.mintingFinished.call().then(function (mintingFinished) {
                                assert.isTrue(mintingFinished);
                            })
                        ]);
                    });
            });
        });

        describe('bonus calculation', function () {
            it('should calculate bonus depending on the bonus level in the block mode', function () {
                return createCampaign().then(function (campaign) {
                    const blockNumber = currentBlock() + 1;
                    var token;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(1),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_BLOCK],
                        [blockNumber + 2, blockNumber + 3],
                        [Campaign.web3.toWei(1.2), Campaign.web3.toWei(1.1)]
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(function () {
                            return campaign.token.call().then(function (tokenAddress) {
                                token = Token.at(tokenAddress);
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[7],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[7]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.2));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[6],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[6]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.1));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[5],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[5]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1));
                            });
                        });
                });
            });

            it('should calculate bonus depending on the bonus level in the timestamp mode', function () {
                return createCampaign().then(function (campaign) {
                    const timestamp = currentTimestamp();
                    const blockNumber = currentBlock() + 1;
                    var token;
                    const snapshotId = Campaign.currentProvider.send({method: 'evm_snapshot'});
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(1),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_TIMESTAMP],
                        [timestamp + 1000, timestamp + 2000],
                        [Campaign.web3.toWei(1.2), Campaign.web3.toWei(1.1)]
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(function () {
                            return campaign.token.call().then(function (tokenAddress) {
                                token = Token.at(tokenAddress);
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[7],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[7]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.2));
                            });
                        })
                        .then(function () {
                            Campaign.currentProvider.send({method: 'evm_increaseTime', params: [1001]});
                            return campaign.sendTransaction({
                                from: accounts[6],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[6]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.1));
                            });
                        })
                        .then(function () {
                            Campaign.currentProvider.send({method: 'evm_increaseTime', params: [1001]});
                            return campaign.sendTransaction({
                                from: accounts[5],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[5]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1));
                            });
                        })
                        // Revert timestamp
                        .then(function () {
                            Campaign.currentProvider.send({method: 'evm_revert', params: [snapshotId]});
                        })
                        .catch(function (reason) {
                            Campaign.currentProvider.send({method: 'evm_revert', params: [snapshotId]});
                            throw reason;
                        });
                });
            });

            it('should calculate bonus depending on the bonus level in the amount raised mode', function () {
                return createCampaign().then(function (campaign) {
                    const blockNumber = currentBlock() + 1;
                    var token;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(1),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_AMOUNT_RAISED],
                        [Campaign.web3.toWei(1), Campaign.web3.toWei(2), Campaign.web3.toWei(3)],
                        [Campaign.web3.toWei(1.3), Campaign.web3.toWei(1.2), Campaign.web3.toWei(1.1)]
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(function () {
                            return campaign.token.call().then(function (tokenAddress) {
                                token = Token.at(tokenAddress);
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[7],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[7]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.3));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[6],
                                to: campaign.address,
                                value: Campaign.web3.toWei(0.5),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[6]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(0.6));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[5],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1.6),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[5]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1.8));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[4],
                                to: campaign.address,
                                value: Campaign.web3.toWei(1),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[4]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(1));
                            });
                        })
                        .then(function () {
                            return campaign.amountRaised.call().then(function (amountRaised) {
                                assert.equal(amountRaised.toString(), Campaign.web3.toWei(4.1));
                            });
                        });
                });
            });

            it('should calculate bonus depending on the bonus level in the contribution amount mode', function () {
                return createCampaign().then(function (campaign) {
                    const blockNumber = currentBlock() + 1;
                    var token;
                    return campaign.setParams(
                        [Campaign.web3.toWei(10), Campaign.web3.toWei(100), Campaign.web3.toWei(1),
                            blockNumber + 1, blockNumber + 1000],
                        [TIME_MODE_BLOCK, BONUS_MODE_CONTRIBUTION_AMOUNT],
                        [Campaign.web3.toWei(0.1), Campaign.web3.toWei(0.2), Campaign.web3.toWei(100)],
                        [Campaign.web3.toWei(1), Campaign.web3.toWei(1.1), Campaign.web3.toWei(1.2)]
                    )
                        .then(function () {
                            return createToken(campaign);
                        })
                        .then(function () {
                            return campaign.token.call().then(function (tokenAddress) {
                                token = Token.at(tokenAddress);
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[5],
                                to: campaign.address,
                                value: Campaign.web3.toWei(0.01),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[5]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(0.01));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[6],
                                to: campaign.address,
                                value: Campaign.web3.toWei(0.11),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[6]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(0.121));
                            });
                        })
                        .then(function () {
                            return campaign.sendTransaction({
                                from: accounts[7],
                                to: campaign.address,
                                value: Campaign.web3.toWei(0.21),
                                gas: GAS_CONTRIBUTION
                            });
                        })
                        .then(function () {
                            return token.balanceOf.call(accounts[7]).then(function (balance) {
                                assert.equal(balance.toString(), Campaign.web3.toWei(0.252));
                            });
                        });
                });
            });
        });
    });

    describe('release of tokens', function () {
        it('should allow to release tokens when the campaign is finished successful', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Campaign is getting finished
                        assert.isAtLeast(currentBlock() + 1, blockNumber + 3);

                        return campaign.releaseTokens({from: accounts[2]});
                    })
                    .then(function () {
                        return token.mintingFinished.call().then(function (mintingFinished) {
                            assert.isTrue(mintingFinished);
                        });
                    });
            });
        });

        it('shouldn’t allow to release already released tokens', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Campaign is getting finished
                        assert.isAtLeast(currentBlock() + 1, blockNumber + 3);

                        return campaign.releaseTokens();
                    })
                    .then(function () {
                        return campaign.releaseTokens()
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });

        it('shouldn’t allow to release tokens if campaign failed', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 2],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        // Campaign is getting finished
                        assert.isAtLeast(currentBlock() + 1, blockNumber + 2);

                        return campaign.releaseTokens()
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });
    });

    describe('payout withdrawal', function () {
        it('should allow to withdraw payout', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                var beneficiaryBalance;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_SUCCESS);
                        });
                    })
                    .then(function () {
                        return campaign.releaseTokens();
                    })
                    .then(function () {
                        return token.mintingFinished.call().then(function (mintingFinished) {
                            assert.isTrue(mintingFinished);
                        });
                    })
                    .then(function () {
                        beneficiaryBalance = Campaign.web3.eth.getBalance(beneficiary);
                        return campaign.withdrawPayout({from: beneficiary});
                    })
                    .then(function (result) {
                        assert.equal(Campaign.web3.eth.getBalance(campaign.address).toString(), '0');

                        const gasCosts = Campaign.web3.eth.getTransaction(result.tx).gasPrice
                            .mul(result.receipt.gasUsed);

                        assert.equal(
                            Campaign.web3.eth.getBalance(beneficiary).toString(),
                            beneficiaryBalance.add(web3.toWei(1)).sub(gasCosts).toString()
                        );

                        assert.equal(result.logs.length, 1);
                        assert.equal(result.logs[0].event, 'Payout');
                        assert.equal(result.logs[0].args.recipient, beneficiary);
                        assert.equal(result.logs[0].args.amount.toString(), Campaign.web3.toWei(1));
                    });
            });
        });

        it('should release tokens if not released yet', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return Promise.all([
                            campaign.stage.call().then(function (stage) {
                                assert.equal(stage.toNumber(), STAGE_SUCCESS);
                            }),
                            token.mintingFinished.call().then(function (mintingFinished) {
                                assert.isFalse(mintingFinished);
                            })
                        ]);
                    })
                    .then(function () {
                        return campaign.withdrawPayout({from: beneficiary});
                    })
                    .then(function () {
                        return token.mintingFinished.call().then(function (mintingFinished) {
                            assert.isTrue(mintingFinished);
                        });
                    });
            });
        });

        it('shouldn’t allow to withdraw payout if campaign isn’t successful', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 1000],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_IN_PROGRESS);
                        });
                    })
                    .then(function () {
                        return campaign.withdrawPayout({from: beneficiary})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });

        it('shouldn’t allow non-beneficiary to withdraw payout', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var token;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.token.call().then(function (tokenAddress) {
                            token = Token.at(tokenAddress);
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_SUCCESS);
                        });
                    })
                    .then(function () {
                        return campaign.withdrawPayout({from: accounts[3]})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });
    });

    describe('refund withdrawal', function () {
        it('should allow to withdraw refund', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                var contributorBalance;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 4],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[6],
                            to: campaign.address,
                            value: Campaign.web3.toWei(1),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_FAILURE);
                        });
                    })
                    .then(function () {
                        contributorBalance = Campaign.web3.eth.getBalance(accounts[5]);
                        return campaign.withdrawRefund({from: accounts[5], gas: GAS_REFUND});
                    })
                    .then(function (result) {
                        assert.equal(Campaign.web3.eth.getBalance(campaign.address).toString(), Campaign.web3.toWei(1));

                        const gasCosts = Campaign.web3.eth.getTransaction(result.tx).gasPrice
                            .mul(result.receipt.gasUsed);

                        assert.equal(
                            Campaign.web3.eth.getBalance(accounts[5]).toString(),
                            contributorBalance.add(web3.toWei(2)).sub(gasCosts).toString()
                        );

                        assert.equal(result.logs.length, 1);
                        assert.equal(result.logs[0].event, 'Refund');
                        assert.equal(result.logs[0].args.recipient, accounts[5]);
                        assert.equal(result.logs[0].args.amount.toString(), Campaign.web3.toWei(2));
                    });
            });
        });

        it('shouldn’t allow to withdraw refund if campaign isn’t failed', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(1), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_SUCCESS);
                        });
                    })
                    .then(function () {
                        return campaign.withdrawRefund({from: accounts[5]})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });

        it('shouldn’t allow non-contributor to withdraw refund', function () {
            return createCampaign().then(function (campaign) {
                const blockNumber = currentBlock() + 1;
                return campaign.setParams(
                    [Campaign.web3.toWei(10), Campaign.web3.toWei(10), Campaign.web3.toWei(0.3),
                        blockNumber + 1, blockNumber + 3],
                    [TIME_MODE_BLOCK, BONUS_MODE_FLAT],
                    [],
                    []
                )
                    .then(function () {
                        return createToken(campaign);
                    })
                    .then(function () {
                        return campaign.sendTransaction({
                            from: accounts[5],
                            to: campaign.address,
                            value: Campaign.web3.toWei(2),
                            gas: GAS_CONTRIBUTION
                        });
                    })
                    .then(function () {
                        // Mine one more block to get the campaign finished
                        Campaign.currentProvider.send({method: 'evm_mine'});

                        return campaign.stage.call().then(function (stage) {
                            assert.equal(stage.toNumber(), STAGE_FAILURE);
                        });
                    })
                    .then(function () {
                        return campaign.withdrawRefund({from: accounts[6]})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            });
                    });
            });
        });
    });
});