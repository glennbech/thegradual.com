import { TEST_CONFIG } from '../config.js';

/**
 * Clean up test data from production
 * Deletes all data associated with the test user UUID
 */
export async function cleanupTestData() {
  const url = `${TEST_CONFIG.apiEndpoint}/${TEST_CONFIG.testUserUUID}`;

  try {
    // First, get current data to see what we're deleting
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('📊 Test data found:', {
        sessions: data.sessions?.length || 0,
        customExercises: data.customExercises?.length || 0,
        customTemplates: data.customTemplates?.length || 0,
        hasActiveSession: !!data.activeSession,
      });
    }

    // Delete by posting empty state
    const deleteResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uuid: TEST_CONFIG.testUserUUID,
        sessions: [],
        customExercises: [],
        customTemplates: [],
        activeSession: null,
      }),
    });

    if (deleteResponse.ok) {
      console.log('✅ Test data cleaned up successfully');
      return true;
    } else {
      console.warn('⚠️  Cleanup request failed:', deleteResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    return false;
  }
}

/**
 * Verify test data is clean before starting tests
 */
export async function verifyCleanState() {
  const url = `${TEST_CONFIG.apiEndpoint}/${TEST_CONFIG.testUserUUID}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // No data exists - that's perfect
      console.log('✅ Test user has no existing data');
      return true;
    }

    const data = await response.json();
    const hasData =
      (data.sessions && data.sessions.length > 0) ||
      (data.customExercises && data.customExercises.length > 0) ||
      (data.customTemplates && data.customTemplates.length > 0) ||
      data.activeSession;

    if (hasData) {
      console.warn('⚠️  Test user has existing data - cleaning up...');
      return await cleanupTestData();
    }

    console.log('✅ Test user state is clean');
    return true;
  } catch (error) {
    console.error('❌ Error verifying clean state:', error.message);
    return false;
  }
}
