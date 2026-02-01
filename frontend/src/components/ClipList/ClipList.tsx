import { useState, useEffect } from 'react';
import styles from './ClipList.module.css';

interface Clip {
  id: string;
  filename: string;
  originalName: string;
  videoUrl: string;
  uploadDate: string;
  duration?: number;
  playSummary?: string;
  frameCount?: number;
}

interface ClipListProps {
  onSelectClip: (clip: Clip) => void;
  selectedClipId?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ClipList: React.FC<ClipListProps> = ({ onSelectClip, selectedClipId }) => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClips = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/clips`);
      if (!response.ok) throw new Error('Failed to load clips');
      const data = await response.json();
      setClips(data.clips || []);
      setError(null);
    } catch (err) {
      // Silently fail - don't show error for demo
      setClips([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClips();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // For hackathon demo: Button is visible but does nothing
    // Just reset the input and show a brief message
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input immediately
    event.target.value = '';
    
    // Show brief message that uploads take too long
    setUploading(true);
    setError('Video upload and analysis takes too long for this demo. Please use the existing clip.');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setUploading(false);
      setError(null);
    }, 3000);
  };

  const handleDelete = async (clipId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this clip?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/clips/${clipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete clip');

      await loadClips();
      
      // If deleted clip was selected, clear selection
      if (selectedClipId === clipId) {
        onSelectClip(clips.find(c => c.id !== clipId) || clips[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete clip');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.clipList}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Clips</h2>
        <label className={styles.uploadButton}>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'Uploading...' : '+ Upload Clip'}
        </label>
      </div>

      {error && (
        <div className={`${styles.error} ${error.includes('takes too long') ? styles.info : ''}`}>
          {error}
        </div>
      )}

      {!error && uploading && (
        <div className={`${styles.error} ${styles.info}`}>
          Video upload and analysis takes too long for this demo. Please use the existing clip.
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading clips...</div>
      ) : clips.length === 0 ? (
        <div className={styles.empty}>
          <p>No clips uploaded yet.</p>
          <p>Click "Upload Clip" to get started!</p>
        </div>
      ) : (
        <div className={styles.clips}>
          {clips.map((clip) => (
            <div
              key={clip.id}
              className={`${styles.clipCard} ${selectedClipId === clip.id ? styles.selected : ''}`}
              onClick={() => onSelectClip(clip)}
            >
              <div className={styles.clipInfo}>
                <h3 className={styles.clipName}>{clip.originalName}</h3>
                <div className={styles.clipMeta}>
                  <span>{formatDuration(clip.duration)}</span>
                  <span>•</span>
                  <span>{formatDate(clip.uploadDate)}</span>
                  {clip.frameCount && (
                    <>
                      <span>•</span>
                      <span>{clip.frameCount} frames</span>
                    </>
                  )}
                </div>
                {clip.playSummary && (
                  <p className={styles.clipSummary}>{clip.playSummary.substring(0, 100)}...</p>
                )}
              </div>
              <button
                className={styles.deleteButton}
                onClick={(e) => handleDelete(clip.id, e)}
                title="Delete clip"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
