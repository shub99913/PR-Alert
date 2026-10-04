// NASA FIRMS Fire Service (Placeholder)
export async function fetchFIRMSFires() {
  try {
    console.log('FIRMS service not fully implemented - requires CSV parsing');
    return [];
  } catch (error) {
    console.error('Error fetching FIRMS fires:', error.message);
    return [];
  }
}