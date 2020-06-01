module.exports = () => ({
    files: [
        'src/*.js',
    ],
    tests: [
        'src/*.test.js'
    ],
    reportConsoleErrorAsError: true,
    runAllTestsInAffectedTestFile: true,
    debug: true,
    env: {
        type: 'node',
        runner: 'node'
    },
    compilers: {
        "**/*.js?(x)": wallaby.compilers.babel()
    },
    testFramework: 'jest',
    setup: function () {
        require('babel-polyfill')
    },
    trace: true
})
