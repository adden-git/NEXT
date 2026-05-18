import base64
from pathlib import Path
from typing import override

import aiohttp
from kosong.message import ImageURLPart, TextPart
from kosong.tooling import CallableTool2, ToolReturnValue
from pydantic import BaseModel, Field

from nexus_station.config import Config
from nexus_station.tools.utils import ToolResultBuilder, load_desc
from nexus_station.utils.logging import logger

if __name__ != "__main__":
    from nexus_station.soul.agent import Runtime


def _closest_aspect_ratio(width: int, height: int) -> str:
    """Map pixel dimensions to the nearest Fireworks-supported aspect ratio."""
    if height <= 0:
        return "1:1"
    ratio = width / height
    ratios = {
        "1:1": 1.0,
        "4:3": 4 / 3,
        "3:4": 3 / 4,
        "16:9": 16 / 9,
        "9:16": 9 / 16,
        "3:2": 3 / 2,
        "2:3": 2 / 3,
        "5:4": 5 / 4,
        "4:5": 4 / 5,
        "21:9": 21 / 9,
        "9:21": 9 / 21,
    }
    return min(ratios.items(), key=lambda item: abs(item[1] - ratio))[0]


class Params(BaseModel):
    prompt: str = Field(description="Text prompt describing the desired image.")
    init_image: str | None = Field(
        default=None,
        description=(
            "Optional base64-encoded image or image URL to use as reference / img2img source. "
            "If provided, the generated image will be based on this image."
        ),
    )
    width: int = Field(default=1024, ge=256, le=2048, description="Image width in pixels.")
    height: int = Field(default=1024, ge=256, le=2048, description="Image height in pixels.")
    steps: int = Field(
        default=4, ge=1, le=50, description="Number of inference steps (quality vs speed)."
    )


class GenerateImage(CallableTool2[Params]):
    name: str = "GenerateImage"
    description: str = load_desc(Path(__file__).parent / "generate_image.md", {})
    params: type[Params] = Params

    def __init__(self, config: Config, runtime: Runtime):
        super().__init__()
        self._config = config
        self._runtime = runtime

    @override
    async def __call__(self, params: Params) -> ToolReturnValue:
        builder = ToolResultBuilder()
        provider = self._config.providers.get("fireworks")
        if provider is None:
            return builder.error(
                "Fireworks provider not configured. Add [providers.fireworks] to config.toml.",
                brief="Missing provider",
            )
        api_key = provider.api_key.get_secret_value() if provider.api_key else None
        if not api_key:
            return builder.error(
                "Fireworks API key is missing.",
                brief="Missing API key",
            )

        url = (
            "https://api.fireworks.ai/inference/v1/workflows/"
            "accounts/fireworks/models/flux-1-dev-fp8/text_to_image"
        )
        aspect_ratio = _closest_aspect_ratio(params.width, params.height)
        payload: dict = {
            "prompt": params.prompt,
            "aspect_ratio": aspect_ratio,
            "num_inference_steps": params.steps,
            "seed": 0,
        }
        # flux-1-dev-fp8 does not support image-to-image; ignore init_image for now.
        if params.init_image:
            logger.info("init_image is not supported by flux-1-dev-fp8 and will be ignored.")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "image/png",
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as resp:
                    if resp.status >= 400:
                        text = await resp.text()
                        logger.warning(
                            "Fireworks image generation failed: status={status}, body={body}",
                            status=resp.status,
                            body=text,
                        )
                        return builder.error(
                            f"Image generation failed with HTTP {resp.status}. {text}",
                            brief=f"HTTP {resp.status}",
                        )
                    image_bytes = await resp.read()
        except aiohttp.ClientError as e:
            logger.warning("Fireworks image generation network error: {error}", error=e)
            return builder.error(
                f"Network error during image generation: {e}",
                brief="Network error",
            )
        except TimeoutError:
            return builder.error(
                "Image generation timed out (120s).",
                brief="Timeout",
            )

        if not image_bytes:
            return builder.error(
                "Empty image response from Fireworks.",
                brief="Empty response",
            )

        # Determine MIME type from response headers or sniff bytes
        content_type = resp.headers.get("Content-Type", "image/png")
        if "jpeg" in content_type or "jpg" in content_type:
            mime = "image/jpeg"
            ext = "jpg"
        elif "png" in content_type:
            mime = "image/png"
            ext = "png"
        else:
            mime = "image/jpeg" if image_bytes[:2] == b"\xff\xd8" else "image/png"
            ext = "jpg" if mime == "image/jpeg" else "png"

        # Save image locally
        import time

        output_dir_str = self._config.image_output_dir
        if output_dir_str:
            output_dir = Path(output_dir_str).expanduser()
        else:
            output_dir = self._runtime.session.dir / "images"
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"generated_{int(time.time())}_{params.steps}steps.{ext}"
        file_path = output_dir / filename
        file_path.write_bytes(image_bytes)

        image_b64 = base64.b64encode(image_bytes).decode()
        image_data_url = f"data:{mime};base64,{image_b64}"

        # Return as ContentPart list so frontend renders the image + text
        return ToolReturnValue(
            is_error=False,
            output=[
                ImageURLPart(image_url=ImageURLPart.ImageURL(url=image_data_url)),
                TextPart(text=f"Image saved to: {file_path}\nPrompt: {params.prompt}"),
            ],
            message="Image generated successfully.",
            display=[],
            extras={"saved_path": str(file_path)},
        )
