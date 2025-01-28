// IndexedDB setup and database operations
class GoalDatabase {
    constructor() {
        this.dbName = 'iplcGoalDB';
        this.dbVersion = 1;
        this.db = null;
        this.dbReady = this.initializeDB();
    }

    async initializeDB() {
        try {
            return new Promise((resolve, reject) => {
                console.log('Initializing IndexedDB...');
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                    reject(event.target.error);
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('Database opened successfully');
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    console.log('Database upgrade needed');
                    const db = event.target.result;

                    // Create goals store
                    if (!db.objectStoreNames.contains('goals')) {
                        console.log('Creating goals store');
                        const goalsStore = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
                        goalsStore.createIndex('category', 'category', { unique: false });
                        goalsStore.createIndex('text', 'text', { unique: false });
                    }

                    // Create selected goals store
                    if (!db.objectStoreNames.contains('selectedGoals')) {
                        console.log('Creating selected goals store');
                        const selectedStore = db.createObjectStore('selectedGoals', { keyPath: 'id', autoIncrement: true });
                        selectedStore.createIndex('category', 'category', { unique: false });
                    }
                };
            });
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    async ensureDbReady() {
        if (!this.db) {
            console.log('Waiting for database initialization...');
            await this.dbReady;
        }
    }

    async loadGoalBank(goals) {
        try {
            await this.ensureDbReady();
            console.log('Loading goals into database...');

            // First clear existing goals
            await this.clearStore('goals');
            console.log('Cleared existing goals');

            // Create a new transaction for adding goals
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['goals'], 'readwrite');
                const store = transaction.objectStore('goals');

                transaction.oncomplete = () => {
                    console.log(`Successfully loaded ${goals.length} goals into database`);
                    resolve();
                };

                transaction.onerror = (event) => {
                    console.error('Error loading goals:', event.target.error);
                    reject(event.target.error);
                };

                // Add all goals within this transaction
                goals.forEach(goal => {
                    store.add(goal);
                });
            });
        } catch (error) {
            console.error('Error in loadGoalBank:', error);
            throw error;
        }
    }

    async clearStore(storeName) {
        try {
            await this.ensureDbReady();
            console.log(`Clearing store: ${storeName}`);

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            store.clear();

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`Successfully cleared ${storeName} store`);
                    resolve();
                };
                transaction.onerror = (event) => {
                    console.error(`Error clearing ${storeName} store:`, event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error in clearStore:', error);
            throw error;
        }
    }

    async getGoalsByCategory(category) {
        try {
            await this.ensureDbReady();
            console.log(`Getting goals for category: ${category}`);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['goals'], 'readonly');
                const store = transaction.objectStore('goals');
                const index = store.index('category');
                const request = index.getAll(category);

                request.onsuccess = () => {
                    console.log(`Found ${request.result.length} goals for category ${category}`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('Error getting goals by category:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getGoalsByCategory:', error);
            throw error;
        }
    }

    async searchGoals(query, categories) {
        try {
            await this.ensureDbReady();
            console.log(`Searching goals with query: "${query}", categories:`, categories);

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['goals'], 'readonly');
                const store = transaction.objectStore('goals');
                const request = store.getAll();

                request.onsuccess = () => {
                    const goals = request.result;
                    const filteredGoals = goals.filter(goal => {
                        const matchesCategory = categories.length === 0 || categories.includes(goal.category);
                        const matchesQuery = !query || goal.text.toLowerCase().includes(query.toLowerCase());
                        return matchesCategory && matchesQuery;
                    });
                    console.log(`Found ${filteredGoals.length} matching goals`);
                    resolve(filteredGoals);
                };

                request.onerror = () => {
                    console.error('Error searching goals:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in searchGoals:', error);
            throw error;
        }
    }

    async addSelectedGoal(goal) {
        try {
            await this.ensureDbReady();
            console.log('Adding selected goal:', goal);

            const transaction = this.db.transaction(['selectedGoals'], 'readwrite');
            const store = transaction.objectStore('selectedGoals');
            
            return new Promise((resolve, reject) => {
                const request = store.add(goal);
                request.onsuccess = () => {
                    console.log('Successfully added selected goal');
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('Error adding selected goal:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in addSelectedGoal:', error);
            throw error;
        }
    }

    async removeSelectedGoal(id) {
        try {
            await this.ensureDbReady();
            console.log('Removing selected goal:', id);

            const transaction = this.db.transaction(['selectedGoals'], 'readwrite');
            const store = transaction.objectStore('selectedGoals');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    console.log('Successfully removed selected goal');
                    resolve();
                };
                request.onerror = () => {
                    console.error('Error removing selected goal:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in removeSelectedGoal:', error);
            throw error;
        }
    }

    async getSelectedGoals() {
        try {
            await this.ensureDbReady();
            console.log('Getting selected goals');

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['selectedGoals'], 'readonly');
                const store = transaction.objectStore('selectedGoals');
                const request = store.getAll();

                request.onsuccess = () => {
                    console.log(`Found ${request.result.length} selected goals`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('Error getting selected goals:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getSelectedGoals:', error);
            throw error;
        }
    }

    async searchWithTensorflow(query, goals, model) {
        try {
            // Create input tensors for the model
            const sentences = [query, ...goals.map(g => g.text)];
            
            // Get embeddings for all sentences
            const embeddings = await model.embed(sentences);
            const embeddingArray = await embeddings.array();
            
            // Get query embedding (first element) and goal embeddings (rest of array)
            const queryEmbedding = embeddingArray[0];
            const goalEmbeddings = embeddingArray.slice(1);
            
            // Calculate cosine similarity between query and each goal
            const similarities = goalEmbeddings.map(goalEmbedding => 
                this.cosineSimilarity(queryEmbedding, goalEmbedding)
            );
            
            // Sort goals by similarity and return top matches
            const rankedGoals = goals.map((goal, i) => ({
                ...goal,
                similarity: similarities[i]
            })).sort((a, b) => b.similarity - a.similarity);
            
            // Clean up tensors to prevent memory leaks
            embeddings.dispose();
            
            return rankedGoals;
        } catch (error) {
            console.error('Error in semantic search:', error);
            // Fall back to regular text search
            return goals.filter(goal => 
                goal.text.toLowerCase().includes(query.toLowerCase())
            );
        }
    }

    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}

// Export the database instance
const goalDB = new GoalDatabase();
export default goalDB;
