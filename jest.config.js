const config = {
    verbose: true,
    rootDir: 'test',
    preset: 'ts-jest',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testRegex: '.*.spec.(js|ts|tsx)$',
    modulePathIgnorePatterns: ['node_modules'],
    moduleFileExtensions: ['js', 'ts'],
    globals: {
        'ts-jest': {
            tsConfig: './tsconfig.json',
        },
    },
};

module.exports = config;
