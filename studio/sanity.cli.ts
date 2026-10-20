import { defineCliConfig } from 'sanity/cli'
import { dataset, projectId } from './env'

export default defineCliConfig({
  api: { projectId, dataset },
  // Sanity hosts the back office (at <name>.sanity.studio) and keeps it on the latest Studio release.
  deployment: { autoUpdates: true },
})
