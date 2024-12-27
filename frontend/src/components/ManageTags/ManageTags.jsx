import { displayToDbKey, dbKeyToDisplay } from '../../utils/tagUtils'

function ManageTags() {
  const handleCreateTag = async (displayName) => {
    const dbKey = displayToDbKey(displayName)
    await createTag({ name: dbKey })
  }

  const renderTags = (tags) => {
    return tags.map(tag => (
      <div key={tag.name}>
        {dbKeyToDisplay(tag.name)}
      </div>
    ))
  }
} 