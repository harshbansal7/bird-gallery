// Convert display name to database key
export const displayToDbKey = (displayName) => {
  return displayName.toLowerCase().replace(/\s+/g, '_')
}

// Convert database key to display name
export const dbKeyToDisplay = (dbKey) => {
  if (dbKey === 'category') {
    return 'Bird Family'
  }
  return dbKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Helper function to check if a tag is a date field
export const isDateField = (dbKey) => dbKey.includes('date') 