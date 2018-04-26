const txStatus = require('./helpers/txStatus');
const decodeLogs = require('./helpers/decodeLogs');

const Billing = artifacts.require('Billing');
const CampaignMock = artifacts.require('CampaignMock');

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
const EMPTY_CODE_HASH = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';

const firstCodeHash = web3.sha3('first');
const secondCodeHash = web3.sha3('second');

contract('Billing', accounts => {
    it('should set the prepayment price', () => {
        return Billing.new()
            .then((billing) => {
                return billing.prepaymentPrice.call()
                    .then(price => web3.fromWei(price).toString().should.be.equal('9.95'))
                    .then(() => billing.setPrepaymentPrice(web3.toWei('8.88')))
                    .then(() => billing.prepaymentPrice.call())
                    .then(price => web3.fromWei(price).toString().should.be.equal('8.88'));
            });
    });

    it('shouldn’t allow to set the prepayment price to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(web3.toWei('8.88'), {from: accounts[2]})
                    .catch(txStatus.fail);
            });
    });

    it('should set the post payment minimum', () => {
        return Billing.new()
            .then((billing) => {
                return billing.postPaymentMin.call()
                    .then(price => web3.fromWei(price).toString().should.be.equal('24.95'))
                    .then(() => billing.setPostPaymentMin(web3.toWei('8.88')))
                    .then(() => billing.postPaymentMin.call())
                    .then(price => web3.fromWei(price).toString().should.be.equal('8.88'));
            });
    });

    it('shouldn’t allow to set the post payment minimum to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentMin(web3.toWei('8.88'), {from: accounts[2]})
                    .catch(txStatus.fail);
            });
    });

    it('should set the post payment rate', () => {
        return Billing.new()
            .then((billing) => {
                return billing.postPaymentRate.call()
                    .then(price => web3.fromWei(price).toString().should.be.equal('0.01'))
                    .then(() => billing.setPostPaymentRate(web3.toWei('0.88')))
                    .then(() => billing.postPaymentRate.call())
                    .then(price => web3.fromWei(price).toString().should.be.equal('0.88'));
            });
    });

    it('shouldn’t set the post payment rate greater or equal to 1', () => {
        return Billing.new()
            .then(billing => billing.setPostPaymentRate(web3.toWei('1')))
            .catch(txStatus.fail);
    });

    it('shouldn’t allow to set the post payment rate to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentRate(web3.toWei('0.88'), {from: accounts[2]})
                    .catch(txStatus.fail);
            });
    });

    it('should add a promo code', () => {
        return Billing.new()
            .then((billing) => {
                return billing.addPromoCode(firstCodeHash, web3.toWei('0.05'), true, accounts[1])
                    .then(() => billing.discounts.call(firstCodeHash))
                    .then(discountParams => {
                        web3.fromWei(discountParams[0]).toString().should.be.equal('0.05');
                        discountParams[1].should.be.true;
                        discountParams[2].should.be.equal(accounts[1]);
                    });
            });
    });

    it('shouldn’t allow to add a promo code with discount greater than 100%', () => {
        return Billing.new()
            .then(billing => billing.addPromoCode(firstCodeHash, web3.toWei('1.1'), true, 0))
            .catch(txStatus.fail);
    });

    it('shouldn’t allow to add a promo code to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.addPromoCode(firstCodeHash, web3.toWei('1.1'), true, 0, {from: accounts[2]})
                    .catch(txStatus.fail);
            });
    });

    it('should bulk add promo codes', () => {
        return Billing.new()
            .then((billing) => {
                return billing.addPromoCodes(
                    [firstCodeHash, secondCodeHash],
                    [web3.toWei('0.05'), web3.toWei('1.15')],
                    [true, false],
                    [accounts[1], 0]
                )
                    .then(() => billing.discounts.call(firstCodeHash))
                    .then(discountParams => {
                        web3.fromWei(discountParams[0]).toString().should.be.equal('0.05');
                        discountParams[1].should.be.true;
                        discountParams[2].should.be.equal(accounts[1]);
                    })

                    .then(() => billing.discounts.call(secondCodeHash))
                    .then(discountParams => {
                        web3.fromWei(discountParams[0]).toString().should.be.equal('1.15');
                        discountParams[1].should.be.false;
                        discountParams[2].should.be.equal(EMPTY_ADDRESS);
                    });
            });
    });

    it('should require all the input arrays to have the same length when bulk adding promo codes', () => {
        return Billing.new()
            .then(billing => Promise.all([
                billing.addPromoCodes(
                    [firstCodeHash, secondCodeHash],
                    [web3.toWei('0.05')], // one item
                    [true, false],
                    [accounts[1], 0]
                ).catch(txStatus.fail),
                billing.addPromoCodes(
                    [firstCodeHash, secondCodeHash],
                    [web3.toWei('0.05'), web3.toWei('1.15')],
                    [true], // one item
                    [accounts[1], 0]
                ).catch(txStatus.fail),
                billing.addPromoCodes(
                    [firstCodeHash, secondCodeHash],
                    [web3.toWei('0.05'), web3.toWei('1.15')],
                    [true, false],
                    [accounts[1]] // one item
                ).catch(txStatus.fail),
            ]));
    });

    it('shouldn’t allow to bulk add promo codes to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.addPromoCodes(
                    [firstCodeHash, secondCodeHash],
                    [web3.toWei('0.05'), web3.toWei('1.15')],
                    [true, false],
                    [accounts[1], 0],
                    {from: accounts[2]}
                ).catch(txStatus.fail);
            });
    });

    it('should set a partner share', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPartnerShare(accounts[1], web3.toWei('0.05'))
                    .then(() => billing.partnerShares.call(accounts[1]))
                    .then(share => web3.fromWei(share).toString().should.be.equal('0.05'));
            });
    });

    it('shouldn’t allow to set a partner share greater than 100%', () => {
        return Billing.new()
            .then(billing => billing.setPartnerShare(accounts[1], web3.toWei('1.1')))
            .catch(txStatus.fail);
    });

    it('shouldn’t allow to set a partner share to all except the owner', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPartnerShare(accounts[1], web3.toWei('0.05'), {from: accounts[2]})
                    .catch(txStatus.fail);
            });
    });

    it('should calculate prepayment', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(web3.toWei('9.95'))
                    .then(() => billing.addPromoCode(firstCodeHash, web3.toWei('5'), false, 0))
                    .then(() => billing.addPromoCode(secondCodeHash, web3.toWei('0.1'), true, 0))

                    .then(() => billing.calculatePrepayment.call(0))
                    .then(payment => web3.fromWei(payment).toString().should.be.equal('9.95'))

                    .then(() => billing.calculatePrepayment.call(firstCodeHash))
                    .then(payment => web3.fromWei(payment).toString().should.be.equal('4.95'))

                    .then(() => billing.calculatePrepayment.call(secondCodeHash))
                    .then(payment => web3.fromWei(payment).toString().should.be.equal('8.955'));
            });
    });

    it('should collect prepayment, make partner rewards, and remove used promo codes', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(1000)
                    .then(() => billing.setPartnerShare(accounts[1], web3.toWei('0.1')))
                    .then(() => billing.addPromoCode(firstCodeHash, 900, false, accounts[1]))

                    .then(() => billing.setPartnerShare(accounts[2], web3.toWei('0.02')))
                    .then(() => billing.addPromoCode(secondCodeHash, web3.toWei('0.8'), true, accounts[2]))

                    .then(() => billing.collectPrepayment('', {value: 1000}))
                    .then(tx => {
                        tx.logs.should.have.length(1);
                        tx.logs[0].event.should.be.equal('Payment');
                        tx.logs[0].args.campaign.should.be.equal(accounts[0]); // normally should be sent from a campaign contract
                        tx.logs[0].args.amount.toString().should.be.equal('1000');
                        tx.logs[0].args.partner.should.be.equal(EMPTY_ADDRESS);
                        tx.logs[0].args.promoCodeHash.should.be.equal(EMPTY_CODE_HASH);
                    })
                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1000'))

                    .then(() => billing.collectPrepayment('first', {value: 100}))
                    .then(tx => {
                        tx.logs.should.have.length(2);

                        tx.logs[0].event.should.be.equal('Payment');
                        tx.logs[0].args.campaign.should.be.equal(accounts[0]); // normally should be sent from a campaign contract
                        tx.logs[0].args.amount.toString().should.be.equal('100');
                        tx.logs[0].args.partner.should.be.equal(accounts[1]);
                        tx.logs[0].args.promoCodeHash.should.be.equal(firstCodeHash);

                        tx.logs[1].event.should.be.equal('Reward');
                        tx.logs[1].args.partner.should.be.equal(accounts[1]);
                        tx.logs[1].args.promoCodeHash.should.be.equal(firstCodeHash);
                        tx.logs[1].args.campaign.should.be.equal(accounts[0]); // normally should be sent from a campaign contract
                        tx.logs[1].args.amount.toString().should.be.equal('10'); // partner reward 100 * 10%
                    })
                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1090')) // 1000 previous + 100 current - 10% reward
                    .then(() => billing.partnerRewards.call(accounts[1]))
                    .then(reward => reward.toString().should.be.equal('10')) // partner reward 100 * 10%

                    .then(() => billing.discounts.call(firstCodeHash))
                    .then(discountParams => { // used code has been removed
                        discountParams[0].toString().should.be.equal('0');
                        discountParams[1].should.be.false;
                        discountParams[2].should.be.equal(EMPTY_ADDRESS);
                    })

                    .then(() => billing.collectPrepayment('second', {value: 200}))
                    .then(tx => {
                        tx.logs.should.have.length(2);

                        tx.logs[0].event.should.be.equal('Payment');
                        tx.logs[0].args.campaign.should.be.equal(accounts[0]); // normally should be sent from a campaign contract
                        tx.logs[0].args.amount.toString().should.be.equal('200');
                        tx.logs[0].args.partner.should.be.equal(accounts[2]);
                        tx.logs[0].args.promoCodeHash.should.be.equal(secondCodeHash);

                        tx.logs[1].event.should.be.equal('Reward');
                        tx.logs[1].args.partner.should.be.equal(accounts[2]);
                        tx.logs[1].args.promoCodeHash.should.be.equal(secondCodeHash);
                        tx.logs[1].args.campaign.should.be.equal(accounts[0]); // normally should be sent from a campaign contract
                        tx.logs[1].args.amount.toString().should.be.equal('4'); // partner reward 200 * 2%
                    })
                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1286')) // 1090 previous + 200 current - 2% reward
                    .then(() => billing.partnerRewards.call(accounts[2]))
                    .then(reward => reward.toString().should.be.equal('4')) // partner reward 100 * 10%
            });
    });

    it('shouldn’t allow to pay less or more', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(1000)
                    .then(() => Promise.all([
                        () => billing.collectPrepayment('', {value: 1000}).then(txStatus.success),
                        () => billing.collectPrepayment('', {value: 999}).catch(txStatus.fail),
                        () => billing.collectPrepayment('', {value: 1001}).catch(txStatus.fail),
                    ]));
            });
    });

    it('should register a campaign for post payment, preserve payment conditions, and remove used promo code', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentMin(1)
                    .then(() => billing.setPostPaymentRate(2))

                    .then(() => billing.setPartnerShare(accounts[1], 3))
                    .then(() => billing.addPromoCode(firstCodeHash, web3.toWei('0.1'), true, accounts[1]))

                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1)
                            .then(() => campaignMock.register(''))
                            .then(() => billing.postPaymentConditions.call(campaignMock.address))
                            .then(conditions => {
                                conditions[0].toString().should.be.equal('1');
                                conditions[1].toString().should.be.equal('2');
                                conditions[2].should.be.equal(EMPTY_CODE_HASH);
                                conditions[3].toString().should.be.equal('0');
                                conditions[4].should.be.false;
                                conditions[5].should.be.equal(EMPTY_ADDRESS);
                            });
                    })

                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1)
                            .then(() => campaignMock.register('first'))
                            .then(() => billing.postPaymentConditions.call(campaignMock.address))
                            .then(conditions => {
                                conditions[0].toString().should.be.equal('1');
                                conditions[1].toString().should.be.equal('2');
                                conditions[2].should.be.equal(firstCodeHash);
                                web3.fromWei(conditions[3]).toString().should.be.equal('0.1');
                                conditions[4].should.be.true;
                                conditions[5].should.be.equal(accounts[1]);
                            });
                    })

                    .then(() => billing.discounts.call(firstCodeHash))
                    .then(discountParams => { // used code has been removed
                        discountParams[0].toString().should.be.equal('0');
                        discountParams[1].should.be.false;
                        discountParams[2].should.be.equal(EMPTY_ADDRESS);
                    });
            });
    });

    it('shouldn’t register a campaign for post payment if its funding threshold is less than post payment minimum', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentMin(5)
                    .then(() => billing.setPostPaymentRate(2))

                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(4)
                            .then(() => campaignMock.register(''))
                            .catch(txStatus.fail);
                    });
            });
    });

    it('should calculate post payment', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentMin(1000)
                    .then(() => billing.setPostPaymentRate(web3.toWei('0.01')))

                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register(''))
                            .then(() => campaignMock.setAmountRaised(99999))
                            .then(() => campaignMock.calculatePostPayment.call())
                            .then(payment => payment.toString().should.be.equal('1000'))

                            .then(() => campaignMock.setAmountRaised(100100))
                            .then(() => campaignMock.calculatePostPayment.call())
                            .then(payment => payment.toString().should.be.equal('1001')); // 100100 * 0.01
                    })

                    .then(() => billing.setPartnerShare(accounts[1], web3.toWei('0.02')))
                    .then(() => billing.addPromoCode(firstCodeHash, web3.toWei('0.1'), true, accounts[1])) // 10%
                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register('first'))
                            .then(() => campaignMock.setAmountRaised(99999))
                            .then(() => campaignMock.calculatePostPayment.call())
                            .then(payment => payment.toString().should.be.equal('900')) // 1000 - 10%

                            .then(() => campaignMock.setAmountRaised(100200))
                            .then(() => campaignMock.calculatePostPayment.call())
                            .then(payment => payment.toString().should.be.equal('901')); // 1002 - 10%
                    });
            });
    });

    it('should collect post payment, make partner rewards, and remove campaign conditions', () => {
        return Billing.new()
            .then((billing) => {
                return billing.setPostPaymentMin(1000)
                    .then(() => billing.setPostPaymentRate(web3.toWei('0.01')))

                    // Min payment, no discount
                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register(''))
                            .then(() => campaignMock.setAmountRaised(99999))
                            .then(() => campaignMock.collectPostPayment({value: 1000}))
                            .then(tx => {
                                const logs = decodeLogs(Billing, tx.receipt.logs);

                                logs.should.have.length(1);
                                logs[0].event.should.be.equal('Payment');
                                logs[0].args.campaign.should.be.equal(campaignMock.address);
                                logs[0].args.amount.toString().should.be.equal('1000');
                                logs[0].args.partner.should.be.equal(EMPTY_ADDRESS);
                                logs[0].args.promoCodeHash.should.be.equal(EMPTY_CODE_HASH);
                            })
                            .then(() => billing.confidealProceeds.call())
                            .then(proceeds => proceeds.toString().should.be.equal('1000'))

                            .then(() => billing.postPaymentConditions.call(campaignMock.address))
                            .then(conditions => {
                                conditions[0].toString().should.be.equal('0');
                                conditions[1].toString().should.be.equal('0');
                                conditions[2].should.be.equal(EMPTY_BYTES32);
                                conditions[3].toString().should.be.equal('0');
                                conditions[4].should.be.false;
                                conditions[5].should.be.equal(EMPTY_ADDRESS);
                            })
                    })

                    // Rate, no discount
                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register(''))
                            .then(() => campaignMock.setAmountRaised(100100))
                            .then(() => campaignMock.collectPostPayment({value: 1001}))
                            .then(tx => {
                                const logs = decodeLogs(Billing, tx.receipt.logs);

                                logs.should.have.length(1);
                                logs[0].event.should.be.equal('Payment');
                                logs[0].args.campaign.should.be.equal(campaignMock.address);
                                logs[0].args.amount.toString().should.be.equal('1001');
                                logs[0].args.partner.should.be.equal(EMPTY_ADDRESS);
                                logs[0].args.promoCodeHash.should.be.equal(EMPTY_CODE_HASH);
                            })
                            .then(() => billing.confidealProceeds.call())
                            .then(payment => payment.toString().should.be.equal('2001')); // 1000 previous + 1001
                    })

                    // Min payment, with discount
                    .then(() => billing.setPartnerShare(accounts[1], web3.toWei('0.02')))
                    .then(() => billing.addPromoCode(firstCodeHash, web3.toWei('0.1'), true, accounts[1]))
                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register('first'))
                            .then(() => campaignMock.setAmountRaised(99999))
                            .then(() => campaignMock.collectPostPayment({value: 900})) // 1000 - 10%
                            .then(tx => {
                                const logs = decodeLogs(Billing, tx.receipt.logs);

                                logs.should.have.length(2);

                                logs[0].event.should.be.equal('Payment');
                                logs[0].args.campaign.should.be.equal(campaignMock.address);
                                logs[0].args.amount.toString().should.be.equal('900');
                                logs[0].args.partner.should.be.equal(accounts[1]);
                                logs[0].args.promoCodeHash.should.be.equal(firstCodeHash);

                                logs[1].event.should.be.equal('Reward');
                                logs[1].args.partner.should.be.equal(accounts[1]);
                                logs[1].args.promoCodeHash.should.be.equal(firstCodeHash);
                                logs[1].args.campaign.should.be.equal(campaignMock.address);
                                logs[1].args.amount.toString().should.be.equal('18'); // 900 * 2%
                            })
                            .then(() => billing.confidealProceeds.call())
                            .then(payment => payment.toString().should.be.equal('2883')) // 2001 previous + 900 - 18 reward

                            .then(() => billing.partnerRewards.call(accounts[1]))
                            .then(rewards => rewards.toString().should.be.equal('18')); // 900 * 2%
                    })

                    // Rate, with discount
                    .then(() => billing.setPartnerShare(accounts[2], web3.toWei('0.1')))
                    .then(() => billing.addPromoCode(secondCodeHash, 100, false, accounts[2]))
                    .then(() => CampaignMock.new(billing.address))
                    .then(campaignMock => {
                        return campaignMock.setFundingThreshold(1000)
                            .then(() => campaignMock.register('second'))
                            .then(() => campaignMock.setAmountRaised(100100))
                            .then(() => campaignMock.collectPostPayment({value: 901})) // 1001 - 100
                            .then(tx => {
                                const logs = decodeLogs(Billing, tx.receipt.logs);

                                logs.should.have.length(2);

                                logs[0].event.should.be.equal('Payment');
                                logs[0].args.campaign.should.be.equal(campaignMock.address);
                                logs[0].args.amount.toString().should.be.equal('901');
                                logs[0].args.partner.should.be.equal(accounts[2]);
                                logs[0].args.promoCodeHash.should.be.equal(secondCodeHash);

                                logs[1].event.should.be.equal('Reward');
                                logs[1].args.partner.should.be.equal(accounts[2]);
                                logs[1].args.promoCodeHash.should.be.equal(secondCodeHash);
                                logs[1].args.campaign.should.be.equal(campaignMock.address);
                                logs[1].args.amount.toString().should.be.equal('90'); // 901 * 10%
                            })
                            .then(() => billing.confidealProceeds.call())
                            .then(payment => payment.toString().should.be.equal('3694')) // 2883 previous + 901 - 90 reward

                            .then(() => billing.partnerRewards.call(accounts[2]))
                            .then(rewards => rewards.toString().should.be.equal('90')); // 901 * 10%
                    })
            });
    });

    it('should allow to withdraw proceeds to the contract owner', () => {
        let balanceBeforeWithdrawal;
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(1000)
                    .then(() => billing.collectPrepayment('', {value: 1000}))

                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1000'))

                    .then(() => {
                        balanceBeforeWithdrawal = web3.eth.getBalance(accounts[0]);
                    })
                    .then(() => billing.withdrawProceeds())
                    .then(tx => {
                        const paidForGas = web3.eth.getTransaction(tx.tx).gasPrice.mul(tx.receipt.gasUsed);
                        const balanceAfterWithdrawal = web3.eth.getBalance(accounts[0]);
                        // balanceAfterWithdrawal - balanceBeforeWithdrawal + paidForGas
                        balanceAfterWithdrawal.sub(balanceBeforeWithdrawal).add(paidForGas).toString().should.be.equal('1000');
                    })

                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('0'));
            });
    });

    it('shouldn’t allow to withdraw proceeds to others', () => {
        let balanceBeforeWithdrawal;
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(1000)
                    .then(() => billing.collectPrepayment('', {value: 1000}))

                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1000'))

                    .then(() => billing.withdrawProceeds({from: accounts[5]})
                        .catch(txStatus.fail)
                    )


                    .then(() => billing.confidealProceeds.call())
                    .then(proceeds => proceeds.toString().should.be.equal('1000'));
            });
    });

    it('should allow to withdraw rewards to partners', () => {
        let balanceBeforeWithdrawal;
        return Billing.new()
            .then((billing) => {
                return billing.setPrepaymentPrice(1000)
                    .then(() => billing.setPartnerShare(accounts[1], web3.toWei('0.15')))

                    .then(() => billing.addPromoCode(firstCodeHash, 900, false, accounts[1]))
                    .then(() => billing.collectPrepayment('first', {value: 100}))

                    .then(() => billing.addPromoCode(secondCodeHash, 800, false, accounts[1]))
                    .then(() => billing.collectPrepayment('second', {value: 200}))

                    .then(() => billing.partnerRewards.call(accounts[1]))
                    .then(rewards => rewards.toString().should.be.equal('45')) // partner reward 300 * 15%

                    .then(() => {
                        balanceBeforeWithdrawal = web3.eth.getBalance(accounts[1]);
                    })
                    .then(() => billing.withdrawRewards({from: accounts[1]}))
                    .then(tx => {
                        const paidForGas = web3.eth.getTransaction(tx.tx).gasPrice.mul(tx.receipt.gasUsed);
                        const balanceAfterWithdrawal = web3.eth.getBalance(accounts[1]);
                        // balanceAfterWithdrawal - balanceBeforeWithdrawal + paidForGas
                        balanceAfterWithdrawal.sub(balanceBeforeWithdrawal).add(paidForGas).toString().should.be.equal('45');
                    })

                    .then(() => billing.partnerRewards.call(accounts[1]))
                    .then(rewards => rewards.toString().should.be.equal('0'));
            });
    });
});