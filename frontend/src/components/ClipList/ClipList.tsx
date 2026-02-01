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
      setError(err instanceof Error ? err.message : 'Failed to load clips');
      setClips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClips();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (200MB max)
    if (file.size > 200 * 1024 * 1024) {
      setError('File size exceeds 200MB limit');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Wait a moment for metadata to be saved, then reload clips list
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadClips();
      
      // Auto-select the newly uploaded clip by matching video URL
      if (result.video_url) {
        const updatedClips = await fetch(`${API_BASE}/api/clips`).then(r => r.json()).then(d => d.clips || []);
        const newClip = updatedClips.find((c: Clip) => c.videoUrl === result.video_url);
        if (newClip) {
          onSelectClip(newClip);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
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
        <div className={styles.error}>
          {error}
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
