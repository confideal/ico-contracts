const Token = artifacts.require('Token');

const TIME_MODE_BLOCK = 0;
const TIME_MODE_TIMESTAMP = 1;

contract('Token', function (accounts) {
    const currentTimestamp = () => Math.floor(new Date / 1000);

    const currentBlock = () => Token.web3.eth.blockNumber;

    const timeLockPeriod = 10;
    const createToken = () => Token.new(
        'Confideal Token',
        'CDL',
        18,
        [accounts[0], accounts[1], accounts[2]],
        [1, 2, 3],
        [0, 0, currentBlock() + timeLockPeriod],
        TIME_MODE_BLOCK
    );

    it('should create a token contract and issue pre-sold tokens', () => {
        return createToken().then(token => Promise.all([
            token.name.call().then(name => assert.equal(name, 'Confideal Token')),
            token.symbol.call().then(tokenSymbol => assert.equal(tokenSymbol, 'CDL')),
            token.decimals.call().then(decimals => assert.equal(decimals, 18)),
            token.balanceOf.call(accounts[0]).then(balance => assert.equal(balance.toString(), '1')),
            token.balanceOf.call(accounts[1]).then(balance => assert.equal(balance.toString(), '2'))
        ]));
    });

    it('shouldn’t allow transfers while minting', () => {
        return createToken().then(token => Promise.all([
            token.mintingFinished.call().then(mintingFinished => assert.equal(mintingFinished, false)),
            token.transfer(accounts[2], 1)
                .then(() => Promise.reject('This call should fail'))
                .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
            token.approve(accounts[0], 1, {from: accounts[1]})
                .then(() => token.transferFrom(accounts[1], accounts[2], 1)
                    .then(() => Promise.reject('This call should fail'))
                    .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
                )
        ]));
    });

    it('should allow transfers after minting', () => {
        return createToken().then(token => {
            return token.finishMinting().then(() => Promise.all([
                token.mintingFinished.call().then(mintingFinished => assert.equal(mintingFinished, true)),
                token.transfer(accounts[2], 1),
                token.approve(accounts[0], 1, {from: accounts[1]})
                    .then(() => token.transferFrom(accounts[1], accounts[2], 1))
            ]));
        });
    });

    describe('in block time mode', () => {
        it('shouldn’t allow transfers from time-locked accounts before release time', () => {
            return createToken().then(token => {
                return token.finishMinting().then(() => Promise.all([
                    token.transfer(accounts[0], 1, {from: accounts[2]})
                        .then(() => Promise.reject('This call should fail'))
                        .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
                    token.approve(accounts[0], 1, {from: accounts[2]})
                        .then(() => token.transferFrom(accounts[2], accounts[1], 1)
                            .then(() => Promise.reject('This call should fail'))
                            .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
                        )
                ]));
            });
        });

        it('should allow transfers from time-locked accounts after release time', () => {
            const blockNumber = currentBlock() + 1;
            return createToken().then(token => {
                return token.finishMinting().then(() => {
                    // Mine some blocks to release tokens
                    for (let i = 0; i < timeLockPeriod + 5; i++) {
                        Token.currentProvider.send({method: 'evm_mine'});
                    }
                    assert.isAtLeast(currentBlock(), blockNumber + timeLockPeriod);

                    return Promise.all([
                        token.transfer(accounts[0], 1, {from: accounts[2]}),
                        token.approve(accounts[0], 1, {from: accounts[2]})
                            .then(() => token.transferFrom(accounts[2], accounts[0], 1)),
                    ]);
                });
            });
        });
    });

    describe('in timestamp time mode', () => {
        it('shouldn’t allow transfers from time-locked accounts before release time', () => {
            return Token.new(
                'Confideal Token',
                'CDL',
                18,
                [accounts[2]],
                [3],
                [currentTimestamp() + 100000],
                TIME_MODE_TIMESTAMP
            ).then(token => {
                return token.finishMinting().then(() => Promise.all([
                    token.transfer(accounts[0], 1, {from: accounts[2]})
                        .then(() => Promise.reject('This call should fail'))
                        .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
                    token.approve(accounts[0], 1, {from: accounts[2]})
                        .then(() => token.transferFrom(accounts[2], accounts[1], 1)
                            .then(() => Promise.reject('This call should fail'))
                            .catch(error => assert.notEqual(error.toString(), 'This call should fail')),
                        )
                ]));
            });
        });

        it('should allow transfers from time-locked accounts after release time', () => {
            return Token.new(
                'Confideal Token',
                'CDL',
                18,
                [accounts[2]],
                [3],
                [currentTimestamp()],
                TIME_MODE_TIMESTAMP
            ).then(token => {
                return token.finishMinting().then(() => Promise.all([
                    token.transfer(accounts[0], 1, {from: accounts[2]}),
                    token.approve(accounts[0], 1, {from: accounts[2]})
                        .then(() => token.transferFrom(accounts[2], accounts[0], 1))
                ]));
            });
        });
    });
});