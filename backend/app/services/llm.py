import os
import json
import boto3

AWS_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

async def call_llm(payload: dict) -> str:
    """
    Calls Amazon Bedrock Nova (or any other specified model) with a formatted prompt.
    'payload' must be a dict containing:
        - 'prompt' (str)
    """
    bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    # The prompt should be in payload["prompt"]
    full_prompt = payload["prompt"]

    bedrock_payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    { "text": full_prompt }
                ]
            }
        ]
    }

    body = json.dumps(bedrock_payload)
    try:
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        response_body = response['body'].read().decode('utf-8')
        response_json = json.loads(response_body)
        output_content = response_json['output']['message']['content']
        if isinstance(output_content, list) and len(output_content) > 0 and 'text' in output_content[0]:
            summary = output_content[0]['text']
        else:
            summary = str(output_content)
        return summary
    except Exception as ex:
        print("Failed to get summary from Bedrock:", ex)
        return str(ex)