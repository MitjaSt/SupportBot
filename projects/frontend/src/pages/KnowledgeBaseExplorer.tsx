import { useState, useDeferredValue } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Search, Science } from '@mui/icons-material';

interface ChunkRow {
  id: string;
  text: string;
  source: string;
  chunkIndex: number;
  chunkLength: number | null;
  createdAt: string;
}

interface KnowledgeBasePage {
  rows: ChunkRow[];
  total: number;
}

interface RetrievalResult {
  id: string;
  score: number;
  text: string;
  source: string;
  chunkIndex: number;
}

interface DialogChunk {
  text: string;
  source: string;
  score?: number;
  chunkIndex?: number;
}

async function fetchSources(): Promise<string[]> {
  const res = await fetch('/api/analytics/knowledge-base/sources');
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json() as Promise<string[]>;
}

async function fetchChunks(
  q: string,
  source: string,
  page: number,
  limit: number,
): Promise<KnowledgeBasePage> {
  const params = new URLSearchParams({ page: String(page + 1), limit: String(limit) });
  if (q) params.set('q', q);
  if (source) params.set('source', source);
  const res = await fetch(`/api/analytics/knowledge-base?${params}`);
  if (!res.ok) throw new Error('Failed to fetch chunks');
  return res.json() as Promise<KnowledgeBasePage>;
}

async function runTestRetrieval(query: string, limit: number): Promise<RetrievalResult[]> {
  const res = await fetch('/api/analytics/knowledge-base/test-retrieval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error('Retrieval failed');
  return res.json() as Promise<RetrievalResult[]>;
}

function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 0.8) return 'success';
  if (score >= 0.6) return 'warning';
  return 'error';
}

function shortSource(src: string) {
  try {
    const url = new URL(src);
    return url.pathname.replace(/^\//, '') || url.hostname;
  } catch {
    return src;
  }
}

/** Wraps query word matches in <mark> for bold highlighting. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return text;
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            style={{ background: '#fff176', fontWeight: 700, padding: '0 1px', borderRadius: 2 }}
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Truncated clickable text cell — opens the detail dialog on click. */
function ChunkTextCell({
  text,
  query,
  onOpen,
}: {
  text: string;
  query: string;
  onOpen: () => void;
}) {
  return (
    <Typography
      variant="body2"
      onClick={onOpen}
      sx={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 360,
        cursor: 'pointer',
        '&:hover': { textDecoration: 'underline', color: 'primary.main' },
      }}
    >
      {highlight(text, query)}
    </Typography>
  );
}

export function KnowledgeBaseExplorer() {
  const navigate = useNavigate();

  // --- Dialog state (shared between both tables) ---
  const [dialogChunk, setDialogChunk] = useState<DialogChunk | null>(null);

  // --- Browse / FTS state ---
  const [searchInput, setSearchInput] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const deferredSearch = useDeferredValue(searchInput);

  const { data: sources = [] } = useQuery({
    queryKey: ['kb-sources'],
    queryFn: fetchSources,
    staleTime: 5 * 60_000,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['kb-chunks', deferredSearch, sourceFilter, page, rowsPerPage],
    queryFn: () => fetchChunks(deferredSearch, sourceFilter, page, rowsPerPage),
    placeholderData: (prev) => prev,
  });

  const handleSearch = (v: string) => { setSearchInput(v); setPage(0); };
  const handleSource = (v: string) => { setSourceFilter(v); setPage(0); };

  // --- Test retrieval state ---
  const [retrievalQuery, setRetrievalQuery] = useState('');
  const [retrievalLimit, setRetrievalLimit] = useState(10);

  const {
    mutate: runRetrieval,
    data: retrievalResults,
    isPending: isRetrieving,
    reset: resetRetrieval,
  } = useMutation({ mutationFn: ({ q, k }: { q: string; k: number }) => runTestRetrieval(q, k) });

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: 'background.default' }}>

      {/* ── Chunk detail dialog ── */}
      <Dialog
        open={dialogChunk !== null}
        onClose={() => setDialogChunk(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ pr: 6 }}>
          Chunk detail
          {dialogChunk?.score !== undefined && (
            <Chip
              label={`Score: ${dialogChunk.score.toFixed(3)}`}
              size="small"
              color={scoreColor(dialogChunk.score)}
              variant="outlined"
              sx={{ ml: 1.5 }}
            />
          )}
          <IconButton
            onClick={() => setDialogChunk(null)}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {dialogChunk && (
            <>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Source: {dialogChunk.source}
                {dialogChunk.chunkIndex !== undefined && ` · index ${dialogChunk.chunkIndex}`}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}
              >
                {highlight(
                  dialogChunk.text,
                  dialogChunk.score !== undefined ? retrievalQuery : deferredSearch,
                )}
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Nav */}
      <Breadcrumbs sx={{ mb: 0.5 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none', fontSize: 14 }}>
          Chat
        </Link>
        <Typography variant="body2" color="text.primary">
          Knowledge Base Explorer
        </Typography>
      </Breadcrumbs>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Knowledge Base Explorer
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* ── Browse / FTS ── */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Browse chunks
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Full-text search…"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />,
          }}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Source</InputLabel>
          <Select label="Source" value={sourceFilter} onChange={(e) => handleSource(e.target.value)}>
            <MenuItem value="">All sources</MenuItem>
            {sources.map((s) => (
              <MenuItem key={s} value={s}>
                <Tooltip title={s} placement="right">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280, display: 'block' }}>
                    {shortSource(s)}
                  </span>
                </Tooltip>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isFetching && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
      </Box>

      <TableContainer component={Paper} sx={{ mb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '42%' }}>Chunk text</TableCell>
              <TableCell sx={{ width: '30%' }}>Source</TableCell>
              <TableCell align="right">Index</TableCell>
              <TableCell align="right">Length</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.rows ?? []).length === 0 && !isFetching ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  {deferredSearch ? 'No chunks matched the search.' : 'Knowledge base is empty.'}
                </TableCell>
              </TableRow>
            ) : (
              (data?.rows ?? []).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <ChunkTextCell
                      text={row.text}
                      query={deferredSearch}
                      onOpen={() =>
                        setDialogChunk({
                          text: row.text,
                          source: row.source,
                          chunkIndex: row.chunkIndex,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.source} placement="top-start">
                      <Typography
                        variant="body2"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}
                      >
                        {shortSource(row.source)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontFamily="monospace">{row.chunkIndex}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{row.chunkLength ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {new Date(row.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={data?.total ?? 0}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
        onPageChange={(_, p) => setPage(p)}
      />

      {/* ── Test retrieval ── */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Science fontSize="small" />
        Test retrieval
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a query to see which chunks RAG would actually retrieve (uses real embeddings + cosine similarity).
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          size="small"
          label="Query"
          placeholder="e.g. what injections are available for wet AMD?"
          value={retrievalQuery}
          onChange={(e) => { setRetrievalQuery(e.target.value); resetRetrieval(); }}
          sx={{ minWidth: 400 }}
        />
        <TextField
          size="small"
          label="Top K"
          type="number"
          value={retrievalLimit}
          onChange={(e) =>
            setRetrievalLimit(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 10)))
          }
          sx={{ width: 80 }}
          inputProps={{ min: 1, max: 50 }}
        />
        <Button
          variant="contained"
          disabled={!retrievalQuery.trim() || isRetrieving}
          onClick={() => runRetrieval({ q: retrievalQuery.trim(), k: retrievalLimit })}
          startIcon={isRetrieving ? <CircularProgress size={16} color="inherit" /> : <Science />}
        >
          Run
        </Button>
        {retrievalResults && (
          <Button variant="text" onClick={() => { resetRetrieval(); setRetrievalQuery(''); }}>
            Clear
          </Button>
        )}
      </Box>

      {retrievalResults && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Score</TableCell>
                <TableCell sx={{ width: '40%' }}>Chunk text</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">Index</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {retrievalResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                    No chunks retrieved — query may be below the score threshold.
                  </TableCell>
                </TableRow>
              ) : (
                retrievalResults.map((r, i) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Chip
                        label={r.score.toFixed(3)}
                        size="small"
                        color={scoreColor(r.score)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <ChunkTextCell
                        text={r.text}
                        query={retrievalQuery}
                        onOpen={() =>
                          setDialogChunk({
                            text: r.text,
                            source: r.source,
                            chunkIndex: r.chunkIndex,
                            score: r.score,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={r.source} placement="top-start">
                        <Typography
                          variant="body2"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}
                        >
                          {shortSource(r.source)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace">
                        #{i + 1} · {r.chunkIndex}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Back button */}
      <Box sx={{ mt: 4 }}>
        <Button variant="text" size="small" onClick={() => navigate('/')}>
          ← Back to chat
        </Button>
      </Box>
    </Box>
  );
}
