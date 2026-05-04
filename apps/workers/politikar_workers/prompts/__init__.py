"""Prompt versions used by the extraction and verification pipeline.

Each prompt has a stable `id` (purpose@vX.Y.Z) and is persisted in the
`prompt_versions` table so that historical verdicts remain reproducible.
"""

from politikar_workers.prompts.claim_extraction import CLAIM_EXTRACTION_V1
from politikar_workers.prompts.verification_cascade import VERIFICATION_CASCADE_V1

__all__ = ["CLAIM_EXTRACTION_V1", "VERIFICATION_CASCADE_V1"]
