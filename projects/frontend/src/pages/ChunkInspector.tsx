import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Upload } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';

interface InspectedChunk {
  index: number;
  text: string;
  tokenCount: number;
  charCount: number;
  overlapWithPrev: string;
}

interface ChunkInspectionResult {
  chunks: InspectedChunk[];
  config: { chunkSizeTokens: number; overlapTokens: number };
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
}

const CHUNK_COLORS = [
  '#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5',
  '#e0f7fa', '#fce4ec', '#f9fbe7', '#ede7f6',
];

const CHUNK_BORDER_COLORS = [
  '#90caf9', '#a5d6a7', '#ffcc80', '#ce93d8',
  '#80deea', '#f48fb1', '#e6ee9c', '#b39ddb',
];

async function inspectChunks(text: string): Promise<ChunkInspectionResult> {
  const res = await fetch('/api/analytics/chunk-inspector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<ChunkInspectionResult>;
}

export function ChunkInspector() {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({ mutationFn: inspectChunks });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText((ev.target?.result as string) ?? '');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Chunk Boundary Inspector
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Paste or upload document text to visualize how the chunking algorithm splits it.
        Overlap regions (carried over from the previous chunk) are highlighted in bold.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Document text"
            multiline
            rows={12}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your document text here..."
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              disabled={!text.trim() || mutation.isPending}
              onClick={() => mutation.mutate(text)}
            >
              {mutation.isPending ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Inspect Chunks
            </Button>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload .txt file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {text.trim() && (
              <Typography variant="caption" color="text.secondary">
                {text.length.toLocaleString()} characters
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error instanceof Error ? mutation.error.message : 'Failed to inspect chunks'}
        </Alert>
      )}

      {mutation.data && (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }} useFlexGap>
            <Chip label={`${mutation.data.totalChunks} chunks`} color="primary" />
            <Chip label={`Avg ${mutation.data.avgTokensPerChunk} tokens/chunk`} color="secondary" />
            <Chip label={`Limit: ${mutation.data.config.chunkSizeTokens} tokens`} variant="outlined" />
            <Chip label={`Overlap: ${mutation.data.config.overlapTokens} tokens`} variant="outlined" />
            <Chip label={`${mutation.data.totalTokens} total tokens`} variant="outlined" />
          </Stack>

          <Stack spacing={1.5}>
            {mutation.data.chunks.map((chunk, i) => {
              const color = CHUNK_COLORS[i % CHUNK_COLORS.length];
              const border = CHUNK_BORDER_COLORS[i % CHUNK_BORDER_COLORS.length];
              const overlap = chunk.overlapWithPrev;
              const unique = overlap ? chunk.text.slice(overlap.length).trimStart() : chunk.text;

              return (
                <Box
                  key={chunk.index}
                  sx={{
                    bgcolor: color,
                    border: `1px solid ${border}`,
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <Typography variant="caption" fontWeight="bold">
                      Chunk {chunk.index + 1}
                    </Typography>
                    <Chip
                      label={`${chunk.tokenCount} tokens`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                    <Chip
                      label={`${chunk.charCount} chars`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                    {overlap && (
                      <Chip
                        label={`${overlap.split(' ').length} overlap words`}
                        size="small"
                        color="warning"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {overlap && (
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 'bold',
                          borderBottom: '2px solid',
                          borderColor: 'warning.main',
                          bgcolor: 'rgba(255,152,0,0.15)',
                        }}
                        title="Overlap from previous chunk"
                      >
                        {overlap}
                      </Box>
                    )}
                    {overlap ? ' ' : ''}{unique}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}
