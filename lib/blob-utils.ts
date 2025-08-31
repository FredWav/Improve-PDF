// lib/blob-utils.ts

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/**
 * Wait for a specified amount of time.
 * @param delay - The delay in milliseconds.
 */
const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

/**
 * A function to perform Blob operations with retry and backoff logic.
 * @param operation - The function to execute the blob operation.
 */
export const executeWithRetry = async (operation: () => Promise<any>): Promise<any> => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes("blob already exists") && attempt < MAX_RETRIES - 1) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
                await wait(delay);
                continue;
            }
            throw error; // Re-throw if it's not the expected error or if we've exhausted retries
        }
    }
};
