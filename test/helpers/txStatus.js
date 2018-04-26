const chai = require('chai');
chai.should();

const txStatusShouldBe = (status, msg) => tx => parseInt(tx.receipt.status, 16).should.be.equal(status, msg);

module.exports = {
    fail: txStatusShouldBe(0, 'expected transaction to fail'),
    success: txStatusShouldBe(1, 'expected transaction to succeed'),
};