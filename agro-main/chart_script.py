import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# Data for the architecture with exact colors from specification
data = {
  "architecture": {
    "layers": [
      {
        "name": "Frontend Layer",
        "components": [
          { "name": "React PWA", "description": "Web app offline support", "color": "#61DAFB" },
          { "name": "React Native", "description": "Cross-platform mobile", "color": "#61DAFB" },
          { "name": "Shared Comp", "description": "Common UI components", "color": "#4FC3F7" }
        ]
      },
      {
        "name": "API Gateway Layer", 
        "components": [
          { "name": "Kong/Nginx", "description": "API routing & auth", "color": "#FF6B35" },
          { "name": "Load Balancer", "description": "Traffic distribution", "color": "#FF8A65" }
        ]
      },
      {
        "name": "Microservices Layer",
        "components": [
          { "name": "Auth Service", "description": "Authentication", "color": "#4CAF50" },
          { "name": "Financial Svc", "description": "Transaction mgmt", "color": "#4CAF50" },
          { "name": "Subsidy Svc", "description": "Gov program mgmt", "color": "#4CAF50" },
          { "name": "Insurance Svc", "description": "Policy & claims", "color": "#4CAF50" },
          { "name": "Analytics Svc", "description": "ML & BI", "color": "#4CAF50" },
          { "name": "Document Svc", "description": "File & OCR", "color": "#4CAF50" },
          { "name": "Notify Svc", "description": "Multi-channel msg", "color": "#4CAF50" }
        ]
      },
      {
        "name": "Message Queue Layer",
        "components": [
          { "name": "Apache Kafka", "description": "Event streaming", "color": "#9C27B0" },
          { "name": "Redis", "description": "Cache & session", "color": "#E91E63" }
        ]
      },
      {
        "name": "Database Layer", 
        "components": [
          { "name": "PostgreSQL", "description": "Relational data", "color": "#336791" },
          { "name": "MongoDB", "description": "Document storage", "color": "#47A248" },
          { "name": "ClickHouse", "description": "Analytics data", "color": "#FFEB3B" },
          { "name": "Elasticsearch", "description": "Search & logging", "color": "#F4B942" }
        ]
      },
      {
        "name": "External Integration Layer",
        "components": [
          { "name": "IoT Platforms", "description": "ThingsBoard AWS", "color": "#607D8B" },
          { "name": "Weather APIs", "description": "Real-time weather", "color": "#03A9F4" },
          { "name": "Gov APIs", "description": "Subsidy systems", "color": "#795548" },
          { "name": "Insurance APIs", "description": "Provider integrat", "color": "#FF5722" }
        ]
      }
    ]
  }
}

# Create figure
fig = go.Figure()

# Layer spacing and positioning - increased for better separation
layer_height = 1.2
component_width = 2.2
component_height = 0.8
layer_gap = 0.8

# Process layers from top to bottom (reverse order for display)
layers = list(reversed(data["architecture"]["layers"]))
total_layers = len(layers)

# Add horizontal separator lines between layers
for layer_idx in range(1, total_layers):
    y_line = (total_layers - layer_idx) * (layer_height + layer_gap) - layer_gap/2
    fig.add_shape(
        type="line",
        x0=-8,
        x1=8,
        y0=y_line,
        y1=y_line,
        line=dict(color="#E0E0E0", width=1, dash="dot")
    )

# Add components as rectangles with hover info
hover_data = []
for layer_idx, layer in enumerate(layers):
    y_pos = (total_layers - layer_idx - 1) * (layer_height + layer_gap)
    components = layer["components"]
    num_components = len(components)
    
    # Calculate starting x position to center components
    total_width = num_components * component_width + (num_components - 1) * 0.3
    start_x = -total_width / 2
    
    for comp_idx, component in enumerate(components):
        x_pos = start_x + comp_idx * (component_width + 0.3)
        
        # Add rectangle shape for component
        fig.add_shape(
            type="rect",
            x0=x_pos,
            y0=y_pos,
            x1=x_pos + component_width,
            y1=y_pos + component_height,
            fillcolor=component["color"],
            line=dict(color="white", width=3)
        )
        
        # Store hover data
        hover_data.append({
            'x': x_pos + component_width/2,
            'y': y_pos + component_height/2,
            'name': component['name'],
            'description': component['description'],
            'layer': layer['name'].replace(' Layer', '')
        })

# Add invisible scatter plot for hover functionality
hover_df = pd.DataFrame(hover_data)
fig.add_trace(go.Scatter(
    x=hover_df['x'],
    y=hover_df['y'],
    mode='markers',
    marker=dict(size=20, opacity=0),
    hovertemplate='<b>%{customdata[0]}</b><br>%{customdata[1]}<br><i>%{customdata[2]} Layer</i><extra></extra>',
    customdata=hover_df[['name', 'description', 'layer']],
    showlegend=False,
    cliponaxis=False
))

# Add component name text with better sizing
for item in hover_data:
    fig.add_annotation(
        x=item['x'],
        y=item['y'],
        text=f"<b>{item['name']}</b>",
        showarrow=False,
        font=dict(color="white", size=13),
        align="center"
    )

# Add layer labels on the left with better spacing
for layer_idx, layer in enumerate(layers):
    y_pos = (total_layers - layer_idx - 1) * (layer_height + layer_gap)
    fig.add_annotation(
        x=-9,
        y=y_pos + component_height/2,
        text=f"<b>{layer['name'].replace(' Layer', '')}</b>",
        showarrow=False,
        font=dict(color="black", size=14),
        align="center",
        textangle=-90
    )

# Add prominent flow arrows between layers
for layer_idx in range(total_layers - 1):
    y_start = (total_layers - layer_idx - 1) * (layer_height + layer_gap) - 0.1
    y_end = (total_layers - layer_idx - 2) * (layer_height + layer_gap) + component_height + 0.1
    
    # Add multiple arrows for better visibility
    for x_offset in [-2, 0, 2]:
        fig.add_annotation(
            x=x_offset,
            y=(y_start + y_end) / 2,
            ax=x_offset,
            ay=y_start,
            arrowhead=2,
            arrowsize=2,
            arrowwidth=3,
            arrowcolor="#4A90E2",
            showarrow=True,
            text=""
        )

# Update layout
fig.update_layout(
    title='DaorsAgro Platform Architecture',
    xaxis=dict(
        range=[-10, 10],
        showgrid=False,
        zeroline=False,
        showticklabels=False,
        fixedrange=True
    ),
    yaxis=dict(
        range=[-1, total_layers * (layer_height + layer_gap) + 1],
        showgrid=False,
        zeroline=False,
        showticklabels=False,
        fixedrange=True
    ),
    showlegend=False,
    plot_bgcolor='white',
    paper_bgcolor='white'
)

# Add data flow description at the top
fig.add_annotation(
    x=0,
    y=total_layers * (layer_height + layer_gap) + 0.3,
    text="↓ Data Flow: Frontend → API Gateway → Microservices → Databases/External Systems ↓",
    showarrow=False,
    font=dict(color="#4A90E2", size=12, family="Arial"),
    align="center"
)

# Save the chart
fig.write_image('daorsagro_architecture.png', width=1500, height=1000, scale=2)