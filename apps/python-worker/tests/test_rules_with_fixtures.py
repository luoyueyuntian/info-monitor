"""Tests for all event rules using shared fixtures.

This test file demonstrates how to use the fixtures module
to quickly write regression tests for event rules.
"""

import pytest

from tests.fixtures import (
    BREAKOUT_UP_SCENARIO,
    CONSECUTIVE_MOVEMENT_SCENARIO,
    CONTENT_UPDATE_SCENARIO,
    FINANCIAL_INJECTION_SCENARIO,
    FINANCIAL_NEUTRAL_SCENARIO,
    FINANCIAL_WITHDRAWAL_SCENARIO,
    KEYWORD_MATCH_SCENARIO,
    MACRO_DEVIATION_SCENARIO,
    PRICE_LOW_SCENARIO,
    PRICE_NOT_LOW_SCENARIO,
    MockNormalizedRecord,
    make_consecutive_movement_config,
    make_financial_event_record,
    make_keyword_match_config,
    make_macro_data_record,
    make_macro_deviation_config,
    make_price_record,
)

from info_monitor_worker.event_rules.consecutive_movement import ConsecutiveMovementRule
from info_monitor_worker.event_rules.financial_direction import FinancialDirectionRule
from info_monitor_worker.event_rules.keyword_match import KeywordMatchRule
from info_monitor_worker.event_rules.macro_deviation import MacroDeviationRule
from info_monitor_worker.event_rules.price_30d_low import ThirtyDayLowRule
from info_monitor_worker.event_rules.price_breakout import PriceBreakoutRule


class TestPriceLowRule:
    """Tests for the 30-day low price rule."""

    def test_triggers_when_below_historical_min(self):
        rule = ThirtyDayLowRule()
        scenario = PRICE_LOW_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            historical_min_price=scenario["historical_min_price"],
        )
        assert scenario["expected"].matches(result)

    def test_does_not_trigger_when_above_historical_min(self):
        rule = ThirtyDayLowRule()
        scenario = PRICE_NOT_LOW_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            historical_min_price=scenario["historical_min_price"],
        )
        assert scenario["expected"].matches(result)

    def test_does_not_trigger_when_no_history(self):
        rule = ThirtyDayLowRule()
        record = make_price_record(price=3999)
        result = rule.evaluate(
            normalized_record=record,
            historical_min_price=None,
        )
        assert result.triggered is False

    def test_evidence_contains_prices(self):
        rule = ThirtyDayLowRule()
        record = make_price_record(price=3999)
        result = rule.evaluate(
            normalized_record=record,
            historical_min_price=4200,
        )
        assert any("3999" in e for e in result.evidence)
        assert any("4200" in e for e in result.evidence)


class TestFinancialDirectionRule:
    """Tests for the financial direction rule."""

    def test_detects_injection_signal(self):
        rule = FinancialDirectionRule()
        scenario = FINANCIAL_INJECTION_SCENARIO
        result = rule.evaluate(normalized_record=scenario["record"])
        assert scenario["expected"].matches(result)

    def test_detects_withdrawal_signal(self):
        rule = FinancialDirectionRule()
        scenario = FINANCIAL_WITHDRAWAL_SCENARIO
        result = rule.evaluate(normalized_record=scenario["record"])
        assert scenario["expected"].matches(result)

    def test_ignores_neutral_events(self):
        rule = FinancialDirectionRule()
        scenario = FINANCIAL_NEUTRAL_SCENARIO
        result = rule.evaluate(normalized_record=scenario["record"])
        assert scenario["expected"].matches(result)

    def test_includes_operation_details_in_evidence(self):
        rule = FinancialDirectionRule()
        record = make_financial_event_record(
            operation_type="MLF",
            amount_billion_cny=1000,
        )
        result = rule.evaluate(normalized_record=record)
        assert any("MLF" in e for e in result.evidence)
        assert any("1000" in e for e in result.evidence)


class TestKeywordMatchRule:
    """Tests for the keyword match rule."""

    def test_matches_keywords_in_content(self):
        rule = KeywordMatchRule()
        scenario = KEYWORD_MATCH_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            config=scenario["config"],
        )
        assert scenario["expected"].matches(result)

    def test_does_not_trigger_without_keyword_match(self):
        rule = KeywordMatchRule()
        record = MockNormalizedRecord(
            title="Regular announcement",
            content={"description": "Nothing special here"},
        )
        config = make_keyword_match_config(keywords=["利好", "增长"])
        result = rule.evaluate(normalized_record=record, config=config)
        assert result.triggered is False

    def test_respects_match_type_all(self):
        rule = KeywordMatchRule()
        record = MockNormalizedRecord(
            title="利好 announcement",
            content={"description": "No growth keyword"},
        )
        config = make_keyword_match_config(
            keywords=["利好", "增长"],
            match_type="all",
        )
        result = rule.evaluate(normalized_record=record, config=config)
        assert result.triggered is False

    def test_case_insensitive_matching(self):
        rule = KeywordMatchRule()
        record = MockNormalizedRecord(
            title="BULLISH signal detected",
            content={"description": "Positive outlook"},
        )
        config = make_keyword_match_config(
            keywords=["bullish"],
            case_sensitive=False,
        )
        result = rule.evaluate(normalized_record=record, config=config)
        assert result.triggered is True


class TestMacroDeviationRule:
    """Tests for the macro deviation rule."""

    def test_detects_positive_deviation(self):
        rule = MacroDeviationRule()
        scenario = MACRO_DEVIATION_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            config=scenario["config"],
        )
        assert scenario["expected"].matches(result)

    def test_detects_negative_deviation(self):
        rule = MacroDeviationRule()
        record = make_macro_data_record(
            actual_value=1.5,
            expected_value=2.0,
        )
        config = make_macro_deviation_config(deviation_threshold=0.5)
        result = rule.evaluate(normalized_record=record, config=config)
        assert result.triggered is True
        assert result.signal == "bearish"

    def test_ignores_small_deviation(self):
        rule = MacroDeviationRule()
        record = make_macro_data_record(
            actual_value=2.01,
            expected_value=2.0,
        )
        config = make_macro_deviation_config(deviation_threshold=1)
        result = rule.evaluate(normalized_record=record, config=config)
        assert result.triggered is False

    def test_handles_missing_values(self):
        rule = MacroDeviationRule()
        record = MockNormalizedRecord(
            title="CPI Release",
            content={"data_type": "CPI"},  # No actual/expected
        )
        result = rule.evaluate(normalized_record=record)
        assert result.triggered is False


class TestPriceBreakoutRule:
    """Tests for the price breakout rule."""

    def test_detects_upward_breakout(self):
        rule = PriceBreakoutRule()
        scenario = BREAKOUT_UP_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            previous_price=scenario["previous_price"],
            config=scenario["config"],
        )
        assert scenario["expected"].matches(result)

    def test_detects_downward_breakout(self):
        rule = PriceBreakoutRule()
        record = make_price_record(price=3000)
        config = {"threshold_percent": 5, "direction": "both"}
        result = rule.evaluate(
            normalized_record=record,
            previous_price=4000,
            config=config,
        )
        assert result.triggered is True
        assert result.signal == "bearish"

    def test_ignores_small_changes(self):
        rule = PriceBreakoutRule()
        record = make_price_record(price=4100)
        config = {"threshold_percent": 5, "direction": "both"}
        result = rule.evaluate(
            normalized_record=record,
            previous_price=4000,
            config=config,
        )
        assert result.triggered is False

    def test_respects_direction_filter(self):
        rule = PriceBreakoutRule()
        record = make_price_record(price=3000)
        config = {"threshold_percent": 5, "direction": "up"}
        result = rule.evaluate(
            normalized_record=record,
            previous_price=4000,
            config=config,
        )
        assert result.triggered is False


class TestConsecutiveMovementRule:
    """Tests for the consecutive movement rule."""

    def test_detects_consecutive_increases(self):
        rule = ConsecutiveMovementRule()
        scenario = CONSECUTIVE_MOVEMENT_SCENARIO
        result = rule.evaluate(
            normalized_record=scenario["record"],
            price_history=scenario["price_history"],
            config=scenario["config"],
        )
        assert scenario["expected"].matches(result)

    def test_detects_consecutive_decreases(self):
        rule = ConsecutiveMovementRule()
        record = make_price_record(price=3000)
        price_history = [5000, 4800, 4600, 4400, 4200, 4000, 3000]
        config = make_consecutive_movement_config(min_consecutive=3, min_percent_per_move=1)
        result = rule.evaluate(
            normalized_record=record,
            price_history=price_history,
            config=config,
        )
        assert result.triggered is True
        assert result.signal == "bearish"

    def test_ignores_alternating_movements(self):
        rule = ConsecutiveMovementRule()
        record = make_price_record(price=4000)
        price_history = [4000, 4100, 4000, 4100, 4000, 4100, 4000]
        config = make_consecutive_movement_config(min_consecutive=3, min_percent_per_move=1)
        result = rule.evaluate(
            normalized_record=record,
            price_history=price_history,
            config=config,
        )
        assert result.triggered is False

    def test_requires_minimum_history(self):
        rule = ConsecutiveMovementRule()
        record = make_price_record(price=4000)
        price_history = [4000, 4100, 4200]  # Only 3 points
        config = make_consecutive_movement_config(min_consecutive=3, min_percent_per_move=1)
        result = rule.evaluate(
            normalized_record=record,
            price_history=price_history,
            config=config,
        )
        assert result.triggered is False  # Need min_consecutive + 1 points
