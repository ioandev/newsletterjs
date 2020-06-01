module.exports = {
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^~/(.*)$': '<rootDir>/$1',
    },
    "moduleDirectories": [
        "node_modules"
    ],
    moduleFileExtensions: [
        'ts',
        'js',
        'json'
    ],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.js',
    ],
    "coverageReporters": ["lcov", "text-summary"],
    "snapshotSerializers": ["jest-serializer-html"],
}
