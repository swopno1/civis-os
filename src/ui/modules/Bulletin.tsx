import { useState, useEffect } from 'preact/hooks';
import type { ICivisModuleContext, ICivisStorageInstance, IMeshClient } from '../../core/ICivisModule';
import './Bulletin.css';

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: 'Trade' | 'Alert' | 'Community';
  timestamp: number;
  sender: string;
}

interface BulletinProps {
  context: ICivisModuleContext;
}

export function Bulletin({ context }: BulletinProps) {
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'Community' as BulletinPost['category'] });
  const [isInitialized, setIsInitialized] = useState(false);
  const [storage, setStorage] = useState<ICivisStorageInstance | null>(null);
  const [meshClient, setMeshClient] = useState<IMeshClient | null>(null);
  const [seenPostIds, setSeenPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initBulletin = async () => {
      try {
        await context.requestPermission('mesh:read');
        await context.requestPermission('mesh:write');
        await context.requestPermission('storage:read');
        await context.requestPermission('storage:write');

        const storageInstance = await context.getStorageInstance('bulletin-data');
        setStorage(storageInstance);

        const client = context.getMeshClient();
        setMeshClient(client);

        const history = await storageInstance.get('civisos_bulletin_posts') || [];
        setPosts(history);
        setSeenPostIds(new Set(history.map((p: BulletinPost) => p.id)));

        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize bulletin", err);
      }
    };

    initBulletin();
  }, [context]);

  useEffect(() => {
    if (isInitialized && storage) {
      storage.put('civisos_bulletin_posts', posts);
    }
  }, [posts, isInitialized, storage]);

  // Inventory Sync Mechanism
  useEffect(() => {
    if (!isInitialized || !meshClient) return;

    const syncInterval = setInterval(async () => {
      // Periodic broadcast of known post IDs (Inventory)
      const inventory = {
        module: 'bulletin',
        type: 'inventory',
        ids: Array.from(seenPostIds)
      };
      await meshClient.send(JSON.stringify(inventory));
    }, 120000); // Every 2 minutes

    return () => clearInterval(syncInterval);
  }, [isInitialized, meshClient, seenPostIds]);

  useEffect(() => {
    if (!isInitialized || !meshClient) return;

    const unlisten = meshClient.listen(async (packet: Uint8Array) => {
      try {
        const rawStr = new TextDecoder().decode(packet);
        const envelope = JSON.parse(rawStr);

        if (envelope.module === 'bulletin') {
          if (envelope.type === 'inventory') {
            // Compare peer's inventory with ours
            const peerIds = envelope.ids as string[];
            const missingIds = peerIds.filter(id => !seenPostIds.has(id));

            for (const id of missingIds) {
              // Request missing post
              const request = {
                module: 'bulletin',
                type: 'request',
                id
              };
              await meshClient.send(JSON.stringify(request));
            }
          } else if (envelope.type === 'request') {
            // Peer requested a post
            const requestedPost = posts.find(p => p.id === envelope.id);
            if (requestedPost) {
              const response = {
                module: 'bulletin',
                post: requestedPost
              };
              await meshClient.send(JSON.stringify(response));
            }
          } else if (envelope.post) {
            const post: BulletinPost = envelope.post;

            if (!seenPostIds.has(post.id)) {
              setPosts(prev => [post, ...prev]);
              setSeenPostIds(prev => new Set(prev).add(post.id));

              // Gossip: rebroadcast unknown posts
              meshClient.send(rawStr);
            }
          }
        }
      } catch (e) {
        // Not a bulletin packet
      }
    });

    return () => unlisten();
  }, [isInitialized, meshClient, seenPostIds, posts]);

  const createPost = async () => {
    if (!newPost.title || !newPost.content || !meshClient) return;

    const post: BulletinPost = {
      id: crypto.randomUUID(),
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      timestamp: Date.now(),
      sender: 'Local Node'
    };

    const envelope = {
      module: 'bulletin',
      post
    };

    await meshClient.send(JSON.stringify(envelope));
    setPosts(prev => [post, ...prev]);
    setSeenPostIds(prev => new Set(prev).add(post.id));
    setNewPost({ title: '', content: '', category: 'Community' });
  };

  if (!isInitialized) return <div className="bulletin-module">Initializing Bulletin Board...</div>;

  return (
    <div className="bulletin-module">
      <header className="bulletin-header">
        <h2>Local Bulletin Board</h2>
        <p>Decentralized gossip-protocol forum for community organization.</p>
      </header>

      <section className="post-form">
        <input
          type="text"
          placeholder="Post Title"
          value={newPost.title}
          onInput={(e) => setNewPost({ ...newPost, title: (e.target as HTMLInputElement).value })}
        />
        <select
          value={newPost.category}
          onChange={(e) => setNewPost({ ...newPost, category: (e.target as HTMLSelectElement).value as any })}
        >
          <option value="Community">Community</option>
          <option value="Trade">Trade</option>
          <option value="Alert">Alert</option>
        </select>
        <textarea
          placeholder="What's happening?"
          value={newPost.content}
          onInput={(e) => setNewPost({ ...newPost, content: (e.target as HTMLTextAreaElement).value })}
        ></textarea>
        <button onClick={createPost}>Broadcast Post</button>
      </section>

      <div className="post-list">
        {posts.length === 0 ? (
          <div className="empty-bulletin">No posts found on the local mesh.</div>
        ) : (
          posts.map(post => (
            <article key={post.id} className={`post-item category-${post.category.toLowerCase()}`}>
              <div className="post-meta">
                <span className="post-category">{post.category}</span>
                <span className="post-date">{new Date(post.timestamp).toLocaleString()}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.content}</p>
              <div className="post-footer">
                <span className="post-sender">Via: {post.sender}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
