import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'src/gql/schema.json',
  documents: ['src/gql/operations/**/*.ts'],
  generates: {
    'src/gql/generated/operations.ts': {
      plugins: ['typescript-operations'],
    },
  },
}

export default config
