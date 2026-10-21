import { defineCliConfig } from 'sanity/cli'
import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  // Sanity hosts the back office at clubcasa.sanity.studio and keeps it on the latest Studio release.
  deployment: { appId: 'enfa4d6ufaxu4wbb743i6u54', autoUpdates: true },
})
