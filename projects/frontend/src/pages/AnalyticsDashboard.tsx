import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TimeSeriesPoint {
  date: string;
  avgScore: number;
  totalQueries: number;
}

interface TopSource {
  source: string;
  retrievalCount: number;
  avgScore: number;
}

interface DeadQuery {
  id: number;
  userMessage: string;
  createdAt: string;
  sessionId: string;
}

interface RetrievalAnalytics {
  summary: {
    totalAssistantMessages: number;
    avgScoreOverall: number | null;
    pctDeadQueries: number;
  };
  timeSeries: TimeSeriesPoint[];
  topSources: TopSource[];
  deadQueries: DeadQuery[];
}

async function fetchAnalytics(token: string | null): Promise<RetrievalAnalytics> {
  const res = await apiFetch('/api/analytics/retrieval', {}, undefined, token ?? undefined);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json() as Promise<RetrievalAnalytics>;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 180 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatSource(src: string) {
  try {
    const url = new URL(src);
    return url.pathname.replace(/^\//, '').slice(0, 60) || url.hostname;
  } catch {
    return src.slice(0, 60);
  }
}

export function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['retrieval-analytics'],
    queryFn: () => fetchAnalytics(token),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4, flex: 1 }}>
        <Typography color="error">Failed to load analytics data.</Typography>
      </Box>
    );
  }

  const { summary, timeSeries, topSources, deadQueries } = data;

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: 'background.default' }}>
      <Breadcrumbs sx={{ mb: 0.5 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          variant="body2"
          onClick={() => navigate('/')}
        >
          Chat
        </Link>
        <Typography variant="body2" color="text.primary">
          Retrieval Analytics
        </Typography>
      </Breadcrumbs>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Retrieval Analytics
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <SummaryCard
          label="Total responses"
          value={summary.totalAssistantMessages.toLocaleString()}
        />
        <SummaryCard
          label="Avg retrieval score"
          value={summary.avgScoreOverall != null ? summary.avgScoreOverall.toFixed(3) : '—'}
          sub="cosine similarity, higher is better"
        />
        <SummaryCard
          label="Dead queries"
          value={`${summary.pctDeadQueries.toFixed(1)}%`}
          sub="0 chunks retrieved"
        />
        <SummaryCard
          label="Dead query count"
          value={deadQueries.length.toLocaleString()}
          sub="last 50 shown below"
        />
      </Box>

      {/* Time series */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Avg retrieval score — last 30 days
      </Typography>
      {timeSeries.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          No data yet.
        </Typography>
      ) : (
        <Paper sx={{ p: 2, mb: 4 }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeSeries} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                minTickGap={20}
              />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={40} />
              <RechartsTooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [(v as number).toFixed(3), 'Avg score']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any) => formatDate(String(label))}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#1976d2"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Top sources */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Top 5 most-retrieved sources
      </Typography>
      {topSources.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          No data yet.
        </Typography>
      ) : (
        <Paper sx={{ p: 2, mb: 4 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topSources}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="source"
                type="category"
                tick={{ fontSize: 11 }}
                width={200}
                tickFormatter={formatSource}
              />
              <RechartsTooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [v as number, 'Retrievals']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any) => String(label)}
              />
              <Bar dataKey="retrievalCount" fill="#7b1fa2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Dead queries table */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Dead queries
        <Chip
          label="0 chunks retrieved"
          size="small"
          sx={{ ml: 1, fontSize: 11, verticalAlign: 'middle' }}
        />
      </Typography>
      {deadQueries.length === 0 ? (
        <Typography color="text.secondary">None — great!</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User question</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deadQueries.map((q) => (
                <TableRow key={q.id} hover>
                  <TableCell sx={{ maxWidth: 500 }}>
                    <Tooltip title={q.userMessage} placement="top-start">
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 480,
                        }}
                      >
                        {q.userMessage}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize={11}>
                      {q.sessionId.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {new Date(q.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
