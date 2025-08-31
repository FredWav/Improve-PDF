// Queue séquentielle en mémoire pour éviter les conflits de concurrence
// Chaque processus Vercel/serveur aura sa propre instance

type QueueTask<T> = () => Promise<T>

class SequentialQueue {
  private queue: Array<{ task: QueueTask<any>; resolve: (value: any) => void; reject: (error: any) => void }> = []
  private processing = false

  async add<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift()!
      
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    this.processing = false
  }

  get length() {
    return this.queue.length
  }

  get isProcessing() {
    return this.processing
  }
}

// Queues globales pour différents types d'opérations
const jobCreationQueue = new SequentialQueue()
const indexUpdateQueue = new SequentialQueue()
const blobWriteQueue = new SequentialQueue()

export { jobCreationQueue, indexUpdateQueue, blobWriteQueue }
