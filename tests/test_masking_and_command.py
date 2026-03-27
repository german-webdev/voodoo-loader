from voodoo_loader.models.download_options import DownloadOptions
from voodoo_loader.models.queue_item import QueueItem
from voodoo_loader.services.aria2_service import Aria2Service, mask_command_for_log


def test_mask_command_hides_bearer_token() -> None:
    cmd = ["aria2c", "--header", "Authorization: Bearer secret-token", "https://example.com/file"]

    masked = mask_command_for_log(cmd)

    assert "secret-token" not in masked
    assert "Authorization: Bearer ***" in masked


def test_build_command_args_includes_optional_auth() -> None:
    item = QueueItem(item_id="1", url="https://example.com/model.bin", destination="C:/tmp")
    options = DownloadOptions(
        destination="C:/tmp",
        connections=8,
        splits=8,
        chunk_size="1M",
        user_agent="UA",
        continue_download=True,
        token="abc",
        username="user",
        password="pass",
        custom_headers=["Cookie: session=1"],
        max_concurrent_downloads=2,
    )

    args = Aria2Service.build_command_args(item, options)

    assert "--http-user" in args
    assert "user" in args
    assert "--http-passwd" in args
    assert "pass" in args
    assert "Cookie: session=1" in args
    assert "Authorization: Bearer abc" in args
    assert "-c" in args

def test_build_command_args_includes_filename_override() -> None:
    item = QueueItem(
        item_id="1",
        url="https://example.com/model.bin",
        destination="C:/tmp",
        filename_override="renamed-model.bin",
    )
    options = DownloadOptions(
        destination="C:/tmp",
        connections=8,
        splits=8,
        chunk_size="1M",
        user_agent="UA",
        continue_download=True,
    )

    args = Aria2Service.build_command_args(item, options)

    assert "-o" in args
    out_index = args.index("-o")
    assert args[out_index + 1] == "renamed-model.bin"



def test_infer_filename_prefers_url_path_before_query() -> None:
    url = (
        "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/"
        "lightx2v_I2V_14B_480p_cfg_step_distill_rank32_bf16.safetensors?download=true"
    )

    assert Aria2Service.infer_filename(url) == "lightx2v_I2V_14B_480p_cfg_step_distill_rank32_bf16.safetensors"


def test_build_command_args_uses_inferred_filename_without_override() -> None:
    item = QueueItem(
        item_id="1",
        url=(
            "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/LoRAs/Stable-Video-Infinity/v2.0/"
            "SVI_v2_PRO_Wan2.2-I2V-A14B_HIGH_lora_rank_128_fp16.safetensors?download=true"
        ),
        destination="C:/tmp",
    )
    options = DownloadOptions(
        destination="C:/tmp",
        connections=8,
        splits=8,
        chunk_size="1M",
        user_agent="UA",
        continue_download=True,
    )

    args = Aria2Service.build_command_args(item, options)

    assert "-o" in args
    out_index = args.index("-o")
    assert args[out_index + 1] == "SVI_v2_PRO_Wan2.2-I2V-A14B_HIGH_lora_rank_128_fp16.safetensors"


def test_build_command_args_without_output_name_when_url_has_no_filename() -> None:
    item = QueueItem(item_id="1", url="https://example.com/?download=true", destination="C:/tmp")
    options = DownloadOptions(
        destination="C:/tmp",
        connections=8,
        splits=8,
        chunk_size="1M",
        user_agent="UA",
        continue_download=True,
    )

    args = Aria2Service.build_command_args(item, options)

    assert "-o" not in args
