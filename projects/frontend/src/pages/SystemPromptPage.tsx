import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSystemPrompt } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function TokenBudgetBar({
  estimatedTokens,
  warnThreshold,
  rejectThreshold,
}: {
  estimatedTokens: number;
  warnThreshold: number;
  rejectThreshold: number;
}) {
  const total = rejectThreshold;
  const capped = Math.min(estimatedTokens, total);
  const safeZoneEnd = Math.min(warnThreshold, total);

  const templatePct = (capped / total) * 100;
  const safePct = Math.max(0, (safeZoneEnd - capped) / total) * 100;
  const warnPct = Math.max(0, (total - Math.max(capped, safeZoneEnd)) / total) * 100;

  const warnMarkerPct = (warnThreshold / total) * 100;

  const overWarn = estimatedTokens >= warnThreshold;
  const overReject = estimatedTokens >= rejectThreshold;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          0 tokens
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Reject limit: {rejectThreshold.toLocaleString()} tokens
        </Typography>
      </Box>

      {/* Bar */}
      <Box
        sx={{
          position: 'relative',
          height: 28,
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          bgcolor: 'grey.100',
          border: 1,
          borderColor: 'divider',
        }}
      >
        {/* Template segment */}
        <Tooltip title={`Prompt template: ~${estimatedTokens.toLocaleString()} tokens`}>
          <Box
            sx={{
              width: `${templatePct}%`,
              bgcolor: overReject ? 'error.main' : overWarn ? 'warning.main' : 'primary.main',
              transition: 'width 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {templatePct > 10 && (
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, px: 0.5 }}>
                ~{estimatedTokens.toLocaleString()} tok
              </Typography>
            )}
          </Box>
        </Tooltip>

        {/* Safe zone (template to warn) */}
        {safePct > 0 && (
          <Box sx={{ width: `${safePct}%`, bgcolor: 'success.light', opacity: 0.35 }} />
        )}

        {/* Warning zone (warn to reject) */}
        {warnPct > 0 && (
          <Box sx={{ width: `${warnPct}%`, bgcolor: 'warning.light', opacity: 0.5 }} />
        )}

        {/* Warn threshold marker */}
        <Box
          sx={{
            position: 'absolute',
            left: `${warnMarkerPct}%`,
            top: 0,
            bottom: 0,
            width: 2,
            bgcolor: 'warning.dark',
            opacity: 0.7,
          }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'primary.main' }} />
          <Typography variant="caption" color="text.secondary">
            Template baseline
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'success.light' }} />
          <Typography variant="caption" color="text.secondary">
            Safe zone (to {warnThreshold.toLocaleString()})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'warning.light' }} />
          <Typography variant="caption" color="text.secondary">
            Warning zone ({warnThreshold.toLocaleString()}–{rejectThreshold.toLocaleString()})
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function SystemPromptPage() {
  const { token } = useAuth();
  const { data, isPending, error } = useQuery({
    queryKey: ['system-prompt'],
    queryFn: () => getSystemPrompt(token ?? undefined),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Prompt
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">Failed to load system prompt: {error.message}</Alert>
      )}

      {data && 'error' in data && (
        <Alert severity="warning">{data.error}</Alert>
      )}

      {data && !('error' in data) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Source + stats row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Source: ${data.source}`}
              color="secondary"
              size="small"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {data.charCount.toLocaleString()} characters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ~{data.estimatedTokens.toLocaleString()} tokens (estimated)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Max output: {data.maxTokens.toLocaleString()} tokens
            </Typography>
          </Box>

          {/* Token budget visualizer */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Token Budget
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Shows how much of the total prompt budget the template alone consumes.
              RAG context and conversation history are added at query time.
            </Typography>
            <TokenBudgetBar
              estimatedTokens={data.estimatedTokens}
              warnThreshold={data.warnThreshold}
              rejectThreshold={data.rejectThreshold}
            />
          </Paper>

          {/* Prompt rendered as markdown */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Prompt Template
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 2,
                  mb: 1,
                  fontWeight: 600,
                },
                '& p': { mb: 1.5, lineHeight: 1.7 },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& li': { mb: 0.5 },
                '& code': {
                  fontFamily: 'monospace',
                  bgcolor: 'grey.100',
                  px: 0.5,
                  borderRadius: 0.5,
                  fontSize: '0.85em',
                },
                '& pre': {
                  bgcolor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  mb: 1.5,
                  '& code': { bgcolor: 'transparent', px: 0, fontSize: '0.875rem' },
                },
                '& blockquote': {
                  borderLeft: 4,
                  borderColor: 'primary.main',
                  pl: 2,
                  ml: 0,
                  color: 'text.secondary',
                },
                '& hr': { my: 2 },
                '& strong': { fontWeight: 700 },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.template}</ReactMarkdown>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
