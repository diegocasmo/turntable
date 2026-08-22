import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'https://backboard.railway.com/graphql/v2',
  generates: {
    'src/gql/schema.json': {
      plugins: ['introspection'],
    },
  },
}

export default config
