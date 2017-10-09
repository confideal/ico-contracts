const Token = artifacts.require('Token');

const TIME_MODE_BLOCK = 0;
const TIME_MODE_TIMESTAMP = 1;

contract('Token', function (accounts) {
    const currentTimestamp = function () {
        return Math.floor(new Date / 1000);
    };

    const currentBlock = function () {
        return Token.web3.eth.blockNumber;
    };

    const timeLockPeriod = 10;
    const createToken = function () {
        return Token.new(
            'Confideal Token',
            'CDL',
            18,
            [accounts[0], accounts[1], accounts[2]],
            [1, 2, 3],
            [0, 0, currentBlock() + timeLockPeriod],
            TIME_MODE_BLOCK
        );
    };

    it('should create a token contract and issue pre-sold tokens', function () {
        return createToken().then(function (token) {
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
                })
            ]);
        });
    });

    it('shouldn’t allow transfers while minting', function () {
        return createToken().then(function (token) {
            return Promise.all([
                token.mintingFinished.call().then(function (mintingFinished) {
                    assert.equal(mintingFinished, false);
                }),
                token.transfer(accounts[2], 1)
                    .then(function () {
                        return Promise.reject('This call should fail');
                    })
                    .catch(function (error) {
                        assert.notEqual(error.toString(), 'This call should fail');
                    }),
                token.approve(accounts[0], 1, {from: accounts[1]}).then(function () {
                    return token.transferFrom(accounts[1], accounts[2], 1)
                        .then(function () {
                            return Promise.reject('This call should fail');
                        })
                        .catch(function (error) {
                            assert.notEqual(error.toString(), 'This call should fail');
                        })
                })
            ]);
        });
    });

    it('should allow transfers after minting', function () {
        return createToken().then(function (token) {
            return token.finishMinting().then(function () {
                return Promise.all([
                    token.mintingFinished.call().then(function (mintingFinished) {
                        assert.equal(mintingFinished, true);
                    }),
                    token.transfer(accounts[2], 1),
                    token.approve(accounts[0], 1, {from: accounts[1]}).then(function () {
                        return token.transferFrom(accounts[1], accounts[2], 1);
                    })
                ]);
            });
        });
    });

    describe('in block time mode', function () {
        it('shouldn’t allow transfers from time-locked accounts before release time', function () {
            return createToken().then(function (token) {
                return token.finishMinting().then(function () {
                    return Promise.all([
                        token.transfer(accounts[0], 1, {from: accounts[2]})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            }),
                        token.approve(accounts[0], 1, {from: accounts[2]}).then(function () {
                            return token.transferFrom(accounts[2], accounts[1], 1)
                                .then(function () {
                                    return Promise.reject('This call should fail');
                                })
                                .catch(function (error) {
                                    assert.notEqual(error.toString(), 'This call should fail');
                                })
                        })
                    ]);
                });
            });
        });

        it('should allow transfers from time-locked accounts after release time', function () {
            const blockNumber = currentBlock() + 1;
            return createToken().then(function (token) {
                return token.finishMinting().then(function () {
                    // Mine some blocks to release tokens
                    for (var i = 0; i < timeLockPeriod + 5; i++) {
                        Token.currentProvider.send({method: 'evm_mine'});
                    }
                    assert.isAtLeast(currentBlock(), blockNumber + timeLockPeriod);

                    return Promise.all([
                        token.transfer(accounts[0], 1, {from: accounts[2]}),
                        token.approve(accounts[0], 1, {from: accounts[2]}).then(function () {
                            return token.transferFrom(accounts[2], accounts[0], 1);
                        })
                    ]);
                });
            });
        });
    });

    describe('in timestamp time mode', function () {
        it('shouldn’t allow transfers from time-locked accounts before release time', function () {
            return Token.new(
                'Confideal Token',
                'CDL',
                18,
                [accounts[2]],
                [3],
                [currentTimestamp() + 100000],
                TIME_MODE_TIMESTAMP
            ).then(function (token) {
                return token.finishMinting().then(function () {
                    return Promise.all([
                        token.transfer(accounts[0], 1, {from: accounts[2]})
                            .then(function () {
                                return Promise.reject('This call should fail');
                            })
                            .catch(function (error) {
                                assert.notEqual(error.toString(), 'This call should fail');
                            }),
                        token.approve(accounts[0], 1, {from: accounts[2]}).then(function () {
                            return token.transferFrom(accounts[2], accounts[1], 1)
                                .then(function () {
                                    return Promise.reject('This call should fail');
                                })
                                .catch(function (error) {
                                    assert.notEqual(error.toString(), 'This call should fail');
                                })
                        })
                    ]);
                });
            });
        });

        it('should allow transfers from time-locked accounts after release time', function () {
            return Token.new(
                'Confideal Token',
                'CDL',
                18,
                [accounts[2]],
                [3],
                [currentTimestamp()],
                TIME_MODE_TIMESTAMP
            ).then(function (token) {
                return token.finishMinting().then(function () {
                    return Promise.all([
                        token.transfer(accounts[0], 1, {from: accounts[2]}),
                        token.approve(accounts[0], 1, {from: accounts[2]}).then(function () {
                            return token.transferFrom(accounts[2], accounts[0], 1);
                        })
                    ]);
                });
            });
        });
    });
});