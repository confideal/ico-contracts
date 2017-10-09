Confideal ICO Smart Contracts
=============================

### Running tests

Install dependencies:
```
npm i
```

Install testrpc:
```
npm -g i ethereumjs-testrpc
```

Run testrpc:
```
testrpc
```

While testrpc is running, run tests:
```
npm test
```

*Due to use of testrpc’s `evm_increaseTime`, you should restart testrpc after each run of tests.*