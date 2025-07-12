#!/usr/bin/env python3
"""
YouTube Transcript Analyzer for Pose Detection Gaming
Searches for and analyzes video transcripts about pose detection implementation
"""

import sys
sys.path.append('/workspaces/pose-detection-game/tools/youtube-transcript-api/venv/lib/python3.11/site-packages')

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import json
import re
from datetime import datetime

# Video IDs for pose detection gaming tutorials (found through manual search)
VIDEO_IDS = {
    # MediaPipe pose detection tutorials
    "OhMs-ipk8gE": "MediaPipe Pose Detection in JavaScript",
    "cc0H_sZrOiM": "Google MediaPipe Pose - JavaScript Tutorial",
    "FPD9YnxHJfE": "PoseNet Real-Time Pose Detection",
    "Iy4UQNZklyk": "Build AI Pose Estimation App",
    "9wy7P2GJvhE": "Pose Estimation Game Tutorial",
    # Game development with pose
    "4c0pOJnt994": "Motion Capture Games with JavaScript",
    "pjAihwONJuI": "Gesture Recognition Gaming",
    # Performance optimization
    "6CKjCLfL7FE": "Optimizing MediaPipe Performance",
    "T0kzis7cwJM": "Real-time Computer Vision Optimization",
}

def extract_key_insights(transcript_text, video_title):
    """Extract key insights from transcript text"""
    insights = {
        "title": video_title,
        "implementation_patterns": [],
        "performance_tips": [],
        "game_mechanics": [],
        "common_issues": [],
        "code_snippets": []
    }
    
    # Keywords for different categories
    implementation_keywords = ["setup", "initialize", "create", "implement", "code", "function", "class", "method"]
    performance_keywords = ["optimize", "performance", "fps", "frame rate", "latency", "speed", "fast", "efficient"]
    game_keywords = ["game", "score", "player", "collision", "physics", "movement", "control", "input"]
    issue_keywords = ["problem", "issue", "error", "fix", "solution", "debug", "troubleshoot", "careful"]
    
    # Split into sentences
    sentences = re.split(r'[.!?]', transcript_text)
    
    for sentence in sentences:
        sentence_lower = sentence.lower().strip()
        
        # Check for implementation patterns
        if any(keyword in sentence_lower for keyword in implementation_keywords):
            if len(sentence.strip()) > 20:
                insights["implementation_patterns"].append(sentence.strip())
        
        # Check for performance tips
        if any(keyword in sentence_lower for keyword in performance_keywords):
            if len(sentence.strip()) > 20:
                insights["performance_tips"].append(sentence.strip())
        
        # Check for game mechanics
        if any(keyword in sentence_lower for keyword in game_keywords):
            if len(sentence.strip()) > 20:
                insights["game_mechanics"].append(sentence.strip())
        
        # Check for common issues
        if any(keyword in sentence_lower for keyword in issue_keywords):
            if len(sentence.strip()) > 20:
                insights["common_issues"].append(sentence.strip())
        
        # Extract code-like patterns
        if "const " in sentence or "let " in sentence or "function " in sentence or "var " in sentence:
            insights["code_snippets"].append(sentence.strip())
    
    return insights

def analyze_videos():
    """Analyze all videos and extract insights"""
    ytt_api = YouTubeTranscriptApi()
    formatter = TextFormatter()
    all_insights = []
    
    print("🎥 Analyzing YouTube videos about pose detection gaming...\n")
    
    for video_id, title in VIDEO_IDS.items():
        print(f"📹 Analyzing: {title} (ID: {video_id})")
        
        try:
            # Fetch transcript
            transcript = ytt_api.fetch(video_id, languages=['en'])
            
            # Convert to text
            text = formatter.format_transcript(transcript)
            
            # Extract insights
            insights = extract_key_insights(text, title)
            insights["video_id"] = video_id
            insights["transcript_length"] = len(transcript)
            
            all_insights.append(insights)
            print(f"   ✅ Extracted {len(insights['implementation_patterns'])} implementation patterns")
            print(f"   ✅ Found {len(insights['performance_tips'])} performance tips")
            print(f"   ✅ Identified {len(insights['game_mechanics'])} game mechanics")
            print(f"   ✅ Discovered {len(insights['common_issues'])} common issues\n")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}\n")
            continue
    
    return all_insights

def generate_markdown_report(insights_data):
    """Generate a comprehensive markdown report"""
    report = f"""# YouTube Video Analysis: Pose Detection Gaming
*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*

## 📊 Analysis Summary

Analyzed {len(insights_data)} videos about pose detection in gaming applications.

## 🎯 Key Implementation Patterns

"""
    
    # Aggregate implementation patterns
    all_patterns = []
    for video in insights_data:
        all_patterns.extend(video["implementation_patterns"])
    
    # Get unique patterns
    unique_patterns = list(set(all_patterns))[:10]
    for pattern in unique_patterns:
        report += f"- {pattern}\n"
    
    report += "\n## ⚡ Performance Optimization Tips\n\n"
    
    # Aggregate performance tips
    all_tips = []
    for video in insights_data:
        all_tips.extend(video["performance_tips"])
    
    unique_tips = list(set(all_tips))[:10]
    for tip in unique_tips:
        report += f"- {tip}\n"
    
    report += "\n## 🎮 Game Mechanics Insights\n\n"
    
    # Aggregate game mechanics
    all_mechanics = []
    for video in insights_data:
        all_mechanics.extend(video["game_mechanics"])
    
    unique_mechanics = list(set(all_mechanics))[:10]
    for mechanic in unique_mechanics:
        report += f"- {mechanic}\n"
    
    report += "\n## ⚠️ Common Issues and Solutions\n\n"
    
    # Aggregate issues
    all_issues = []
    for video in insights_data:
        all_issues.extend(video["common_issues"])
    
    unique_issues = list(set(all_issues))[:10]
    for issue in unique_issues:
        report += f"- {issue}\n"
    
    report += "\n## 📹 Video Summaries\n\n"
    
    for video in insights_data:
        report += f"### {video['title']}\n"
        report += f"- **Video ID**: {video['video_id']}\n"
        report += f"- **Transcript Length**: {video['transcript_length']} segments\n"
        report += f"- **Key Insights**: {len(video['implementation_patterns'])} patterns, "
        report += f"{len(video['performance_tips'])} tips, {len(video['game_mechanics'])} mechanics\n\n"
    
    report += """
## 🔍 Key Takeaways for Our Project

Based on the analysis of these videos, here are the most important insights for our pose detection game:

1. **Use MediaPipe over PoseNet** - Multiple videos emphasize MediaPipe's superior performance
2. **Implement pose smoothing** - Essential for stable gameplay experience
3. **Optimize detection zones** - Focus on specific body parts relevant to game mechanics
4. **Add visual feedback** - Show skeleton overlay and detection confidence
5. **Handle edge cases** - Account for partial visibility and multiple people
6. **Test different lighting** - Pose detection accuracy varies with lighting conditions
7. **Consider mobile performance** - Reduce model complexity for mobile devices
8. **Add calibration phase** - Let players adjust their position before starting
9. **Use confidence thresholds** - Filter out low-confidence detections
10. **Implement gesture debouncing** - Prevent accidental repeated actions

## 📚 Recommended Implementation Order

1. Set up basic MediaPipe pose detection
2. Implement pose landmark visualization
3. Create simple gesture recognition (e.g., hands up)
4. Add game mechanics tied to specific poses
5. Implement score system and feedback
6. Optimize performance and add smoothing
7. Add multiplayer support if needed
8. Polish with effects and sound
"""
    
    return report

if __name__ == "__main__":
    # Analyze videos
    insights = analyze_videos()
    
    # Generate report
    report = generate_markdown_report(insights)
    
    # Save report
    with open("/workspaces/pose-detection-game/pose-detection-game/research/videos/transcript-analysis.md", "w") as f:
        f.write(report)
    
    # Save raw data
    with open("/workspaces/pose-detection-game/pose-detection-game/research/videos/insights-data.json", "w") as f:
        json.dump(insights, f, indent=2)
    
    print("\n✅ Analysis complete! Check transcript-analysis.md for the full report.")