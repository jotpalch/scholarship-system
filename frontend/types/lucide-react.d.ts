declare module 'lucide-react' {
  import * as React from 'react'
  // Re-export any component as React component type
  // This lightweight declaration is only for type resolution in tests/linting.
  const content: { [key: string]: React.ComponentType<any> }
  export = content
}