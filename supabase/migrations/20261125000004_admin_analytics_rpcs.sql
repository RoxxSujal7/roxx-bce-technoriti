-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 004: Role-Scoped Admin & Coordinator Analytics RPCs
-- Security: SECURITY DEFINER, service_role only, zero PII or full UTR exposure
-- Timezone: Explicit Asia/Kolkata weekly bucketing across registration & payment trends
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_ist TIMESTAMP := timezone('Asia/Kolkata', NOW());
  v_cur_week TIMESTAMP := date_trunc('week', v_now_ist);
  v_reg_stats RECORD;
  v_pay_stats RECORD;
  v_trends JSONB;
  v_comps JSONB;
BEGIN
  SELECT
    COUNT(*)::BIGINT AS total_registrations,
    COUNT(*) FILTER (WHERE status = 'PENDING_PAYMENT')::BIGINT AS pending_payment,
    COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION')::BIGINT AS pending_verification_registrations,
    COUNT(*) FILTER (WHERE status = 'VERIFIED')::BIGINT AS verified_registrations,
    COUNT(*) FILTER (WHERE status = 'REJECTED')::BIGINT AS rejected_registrations,
    COALESCE(SUM(team_size) FILTER (WHERE status = 'VERIFIED'), 0)::BIGINT AS confirmed_participants,
    COALESCE(SUM(computed_total_inr) FILTER (WHERE status = 'PENDING_PAYMENT'), 0)::BIGINT AS unpaid_registrations_amount_inr,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT AS last_7d_registrations,
    COUNT(*) FILTER (
      WHERE created_at >= NOW() - INTERVAL '14 days'
        AND created_at < NOW() - INTERVAL '7 days'
    )::BIGINT AS prev_7d_registrations
  INTO v_reg_stats
  FROM public.registrations;

  SELECT
    COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION')::BIGINT AS pending_verifications_count,
    COUNT(*) FILTER (WHERE status = 'VERIFIED')::BIGINT AS verified_payments_count,
    COUNT(*) FILTER (WHERE status = 'REJECTED')::BIGINT AS rejected_payments_count,
    COALESCE(SUM(amount_inr) FILTER (WHERE status = 'VERIFIED'), 0)::BIGINT AS verified_collections_inr,
    COALESCE(SUM(amount_inr) FILTER (WHERE status = 'PENDING_VERIFICATION'), 0)::BIGINT AS pending_verification_amount_inr,
    COUNT(*) FILTER (WHERE status = 'VERIFIED' AND verified_at >= NOW() - INTERVAL '7 days')::BIGINT AS last_7d_verified_payments
  INTO v_pay_stats
  FROM public.payments;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'week_start', to_char(w.week_ts, 'YYYY-MM-DD'),
        'week', to_char(w.week_ts, 'DD Mon'),
        'registrations', COALESCE(rc.cnt, 0),
        'payments_verified', COALESCE(pc.cnt, 0)
      )
      ORDER BY w.week_ts ASC
    ),
    '[]'::jsonb
  )
  INTO v_trends
  FROM generate_series(v_cur_week - INTERVAL '7 weeks', v_cur_week, INTERVAL '1 week') AS w(week_ts)
  LEFT JOIN (
    SELECT
      date_trunc('week', timezone('Asia/Kolkata', created_at)) AS wk,
      COUNT(*)::BIGINT AS cnt
    FROM public.registrations
    WHERE timezone('Asia/Kolkata', created_at) >= v_cur_week - INTERVAL '7 weeks'
    GROUP BY 1
  ) rc ON rc.wk = w.week_ts
  LEFT JOIN (
    SELECT
      date_trunc('week', timezone('Asia/Kolkata', verified_at)) AS wk,
      COUNT(*)::BIGINT AS cnt
    FROM public.payments
    WHERE status = 'VERIFIED'
      AND verified_at IS NOT NULL
      AND timezone('Asia/Kolkata', verified_at) >= v_cur_week - INTERVAL '7 weeks'
    GROUP BY 1
  ) pc ON pc.wk = w.week_ts;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'num_id', c.num_id,
        'title', c.title,
        'category', c.category,
        'is_active', c.is_active,
        'event_date', c.event_date,
        'event_time', c.event_time,
        'venue', c.venue,
        'min_team_size', c.min_team_size,
        'max_team_size', c.max_team_size,
        'registration_count', COALESCE(agg.registration_count, 0),
        'verified_count', COALESCE(agg.verified_count, 0),
        'pending_count', COALESCE(agg.pending_count, 0),
        'participant_count', COALESCE(agg.participant_count, 0)
      )
      ORDER BY COALESCE(agg.registration_count, 0) DESC, c.num_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_comps
  FROM public.competitions c
  LEFT JOIN (
    SELECT
      ra.competition_id,
      COUNT(DISTINCT ra.registration_id)::BIGINT AS registration_count,
      COUNT(DISTINCT ra.registration_id) FILTER (WHERE r.status = 'VERIFIED')::BIGINT AS verified_count,
      COUNT(DISTINCT ra.registration_id) FILTER (WHERE r.status IN ('PENDING_PAYMENT', 'PENDING_VERIFICATION'))::BIGINT AS pending_count,
      COALESCE(SUM(CASE WHEN ra.is_primary THEN r.team_size ELSE 1 END) FILTER (WHERE r.status = 'VERIFIED'), 0)::BIGINT AS participant_count
    FROM public.registration_arenas ra
    JOIN public.registrations r ON r.id = ra.registration_id
    GROUP BY ra.competition_id
  ) agg ON agg.competition_id = c.id;

  RETURN jsonb_build_object(
    'timezone', 'Asia/Kolkata',
    'kpis', jsonb_build_object(
      'total_registrations', COALESCE(v_reg_stats.total_registrations, 0),
      'pending_payment', COALESCE(v_reg_stats.pending_payment, 0),
      'pending_verification_registrations', COALESCE(v_reg_stats.pending_verification_registrations, 0),
      'verified_registrations', COALESCE(v_reg_stats.verified_registrations, 0),
      'rejected_registrations', COALESCE(v_reg_stats.rejected_registrations, 0),
      'confirmed_participants', COALESCE(v_reg_stats.confirmed_participants, 0),
      'pending_verifications_count', COALESCE(v_pay_stats.pending_verifications_count, 0),
      'verified_payments_count', COALESCE(v_pay_stats.verified_payments_count, 0),
      'rejected_payments_count', COALESCE(v_pay_stats.rejected_payments_count, 0),
      'verified_collections_inr', COALESCE(v_pay_stats.verified_collections_inr, 0),
      'pending_verification_amount_inr', COALESCE(v_pay_stats.pending_verification_amount_inr, 0),
      'unpaid_registrations_amount_inr', COALESCE(v_reg_stats.unpaid_registrations_amount_inr, 0),
      'last_7d_registrations', COALESCE(v_reg_stats.last_7d_registrations, 0),
      'prev_7d_registrations', COALESCE(v_reg_stats.prev_7d_registrations, 0),
      'last_7d_verified_payments', COALESCE(v_pay_stats.last_7d_verified_payments, 0)
    ),
    'trends', v_trends,
    'competitions_overview', v_comps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_analytics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_analytics() TO service_role;

CREATE OR REPLACE FUNCTION public.get_coordinator_dashboard_analytics(
  p_competition_ids TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp_ids TEXT[] := COALESCE(p_competition_ids, ARRAY[]::TEXT[]);
  v_now_ist TIMESTAMP := timezone('Asia/Kolkata', NOW());
  v_cur_week TIMESTAMP := date_trunc('week', v_now_ist);
  v_stats RECORD;
  v_trends JSONB;
  v_comps JSONB;
BEGIN
  IF cardinality(v_comp_ids) = 0 THEN
    RETURN jsonb_build_object(
      'timezone', 'Asia/Kolkata',
      'kpis', jsonb_build_object(
        'total_registrations', 0,
        'verified_registrations', 0,
        'confirmed_participants', 0,
        'pending_registrations', 0,
        'assigned_competitions_count', 0
      ),
      'trends', '[]'::jsonb,
      'competitions_overview', '[]'::jsonb
    );
  END IF;

  WITH matched AS (
    SELECT DISTINCT ON (r.id)
      r.id,
      r.status,
      r.team_size,
      r.created_at,
      ra.is_primary
    FROM public.registrations r
    JOIN public.registration_arenas ra ON ra.registration_id = r.id
    WHERE ra.competition_id = ANY(v_comp_ids)
    ORDER BY r.id, ra.is_primary DESC
  )
  SELECT
    COUNT(*)::BIGINT AS total_registrations,
    COUNT(*) FILTER (WHERE status = 'VERIFIED')::BIGINT AS verified_registrations,
    COALESCE(SUM(CASE WHEN is_primary THEN team_size ELSE 1 END) FILTER (WHERE status = 'VERIFIED'), 0)::BIGINT AS confirmed_participants,
    COUNT(*) FILTER (WHERE status IN ('PENDING_PAYMENT', 'PENDING_VERIFICATION'))::BIGINT AS pending_registrations
  INTO v_stats
  FROM matched;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'week_start', to_char(w.week_ts, 'YYYY-MM-DD'),
        'week', to_char(w.week_ts, 'DD Mon'),
        'registrations', COALESCE(rc.cnt, 0),
        'verified_passes', COALESCE(rc.ver_cnt, 0)
      )
      ORDER BY w.week_ts ASC
    ),
    '[]'::jsonb
  )
  INTO v_trends
  FROM generate_series(v_cur_week - INTERVAL '7 weeks', v_cur_week, INTERVAL '1 week') AS w(week_ts)
  LEFT JOIN (
    SELECT
      date_trunc('week', timezone('Asia/Kolkata', m.created_at)) AS wk,
      COUNT(*)::BIGINT AS cnt,
      COUNT(*) FILTER (WHERE m.status = 'VERIFIED')::BIGINT AS ver_cnt
    FROM (
      SELECT DISTINCT r.id, r.status, r.created_at
      FROM public.registrations r
      JOIN public.registration_arenas ra ON ra.registration_id = r.id
      WHERE ra.competition_id = ANY(v_comp_ids)
    ) m
    WHERE timezone('Asia/Kolkata', m.created_at) >= v_cur_week - INTERVAL '7 weeks'
    GROUP BY 1
  ) rc ON rc.wk = w.week_ts;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'num_id', c.num_id,
        'title', c.title,
        'category', c.category,
        'is_active', c.is_active,
        'event_date', c.event_date,
        'event_time', c.event_time,
        'venue', c.venue,
        'min_team_size', c.min_team_size,
        'max_team_size', c.max_team_size,
        'registration_count', COALESCE(agg.registration_count, 0),
        'verified_count', COALESCE(agg.verified_count, 0),
        'pending_count', COALESCE(agg.pending_count, 0),
        'participant_count', COALESCE(agg.participant_count, 0)
      )
      ORDER BY COALESCE(agg.registration_count, 0) DESC, c.num_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_comps
  FROM public.competitions c
  LEFT JOIN (
    SELECT
      ra.competition_id,
      COUNT(DISTINCT ra.registration_id)::BIGINT AS registration_count,
      COUNT(DISTINCT ra.registration_id) FILTER (WHERE r.status = 'VERIFIED')::BIGINT AS verified_count,
      COUNT(DISTINCT ra.registration_id) FILTER (WHERE r.status IN ('PENDING_PAYMENT', 'PENDING_VERIFICATION'))::BIGINT AS pending_count,
      COALESCE(SUM(CASE WHEN ra.is_primary THEN r.team_size ELSE 1 END) FILTER (WHERE r.status = 'VERIFIED'), 0)::BIGINT AS participant_count
    FROM public.registration_arenas ra
    JOIN public.registrations r ON r.id = ra.registration_id
    WHERE ra.competition_id = ANY(v_comp_ids)
    GROUP BY ra.competition_id
  ) agg ON agg.competition_id = c.id
  WHERE c.id = ANY(v_comp_ids);

  RETURN jsonb_build_object(
    'timezone', 'Asia/Kolkata',
    'kpis', jsonb_build_object(
      'total_registrations', COALESCE(v_stats.total_registrations, 0),
      'verified_registrations', COALESCE(v_stats.verified_registrations, 0),
      'confirmed_participants', COALESCE(v_stats.confirmed_participants, 0),
      'pending_registrations', COALESCE(v_stats.pending_registrations, 0),
      'assigned_competitions_count', cardinality(v_comp_ids)
    ),
    'trends', v_trends,
    'competitions_overview', v_comps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coordinator_dashboard_analytics(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_dashboard_analytics(TEXT[]) TO service_role;
