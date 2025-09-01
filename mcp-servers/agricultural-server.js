#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class AgriculturalMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'agricultural-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'calculate_crop_yield',
            description: 'Calculate estimated crop yield based on various factors',
            inputSchema: {
              type: 'object',
              properties: {
                crop_type: { type: 'string', description: 'Type of crop (wheat, corn, rice, etc.)' },
                area_hectares: { type: 'number', description: 'Area in hectares' },
                soil_quality: { type: 'string', enum: ['poor', 'average', 'good', 'excellent'], description: 'Soil quality rating' },
                irrigation: { type: 'boolean', description: 'Whether irrigation is available' },
                weather_conditions: { type: 'string', enum: ['poor', 'average', 'good', 'excellent'], description: 'Weather conditions' },
                fertilizer_used: { type: 'boolean', description: 'Whether fertilizer was used' },
              },
              required: ['crop_type', 'area_hectares'],
            },
          },
          {
            name: 'analyze_weather_impact',
            description: 'Analyze how weather conditions affect crop production',
            inputSchema: {
              type: 'object',
              properties: {
                temperature: { type: 'number', description: 'Average temperature in Celsius' },
                rainfall: { type: 'number', description: 'Total rainfall in mm' },
                humidity: { type: 'number', description: 'Average humidity percentage' },
                crop_type: { type: 'string', description: 'Type of crop being analyzed' },
                growth_stage: { type: 'string', enum: ['planting', 'vegetative', 'flowering', 'maturation', 'harvest'], description: 'Current growth stage' },
              },
              required: ['temperature', 'rainfall', 'crop_type'],
            },
          },
          {
            name: 'calculate_subsidy_eligibility',
            description: 'Calculate potential subsidy amounts and eligibility',
            inputSchema: {
              type: 'object',
              properties: {
                farm_size: { type: 'number', description: 'Farm size in hectares' },
                crop_types: { type: 'array', items: { type: 'string' }, description: 'Types of crops grown' },
                region: { type: 'string', description: 'Geographic region' },
                farming_method: { type: 'string', enum: ['conventional', 'organic', 'sustainable'], description: 'Farming method used' },
                income_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Farm income level' },
              },
              required: ['farm_size', 'crop_types', 'region'],
            },
          },
          {
            name: 'predict_market_prices',
            description: 'Predict future commodity prices based on historical data',
            inputSchema: {
              type: 'object',
              properties: {
                commodity: { type: 'string', description: 'Commodity type (wheat, corn, etc.)' },
                current_price: { type: 'number', description: 'Current market price' },
                time_horizon: { type: 'string', enum: ['1month', '3months', '6months', '1year'], description: 'Prediction time horizon' },
                market_factors: { type: 'object', description: 'Additional market factors' },
              },
              required: ['commodity', 'current_price', 'time_horizon'],
            },
          },
          {
            name: 'calculate_irrigation_needs',
            description: 'Calculate irrigation water requirements for crops',
            inputSchema: {
              type: 'object',
              properties: {
                crop_type: { type: 'string', description: 'Type of crop' },
                area_hectares: { type: 'number', description: 'Area in hectares' },
                soil_type: { type: 'string', enum: ['sandy', 'loamy', 'clay'], description: 'Soil type' },
                temperature: { type: 'number', description: 'Average temperature in Celsius' },
                humidity: { type: 'number', description: 'Average humidity percentage' },
                growth_stage: { type: 'string', enum: ['planting', 'vegetative', 'flowering', 'maturation'], description: 'Crop growth stage' },
              },
              required: ['crop_type', 'area_hectares', 'soil_type'],
            },
          },
          {
            name: 'analyze_soil_health',
            description: 'Analyze soil health based on various parameters',
            inputSchema: {
              type: 'object',
              properties: {
                ph_level: { type: 'number', description: 'Soil pH level' },
                nitrogen: { type: 'number', description: 'Nitrogen content (ppm)' },
                phosphorus: { type: 'number', description: 'Phosphorus content (ppm)' },
                potassium: { type: 'number', description: 'Potassium content (ppm)' },
                organic_matter: { type: 'number', description: 'Organic matter percentage' },
                crop_type: { type: 'string', description: 'Intended crop type' },
              },
              required: ['ph_level', 'crop_type'],
            },
          },
          {
            name: 'calculate_farm_profitability',
            description: 'Calculate overall farm profitability and ROI',
            inputSchema: {
              type: 'object',
              properties: {
                total_revenue: { type: 'number', description: 'Total farm revenue' },
                total_costs: { type: 'number', description: 'Total farm costs' },
                investment_amount: { type: 'number', description: 'Initial investment amount' },
                time_period_years: { type: 'number', description: 'Time period in years' },
              },
              required: ['total_revenue', 'total_costs'],
            },
          },
          {
            name: 'generate_farm_report',
            description: 'Generate a comprehensive farm performance report',
            inputSchema: {
              type: 'object',
              properties: {
                farm_data: { type: 'object', description: 'Farm data and metrics' },
                report_type: { type: 'string', enum: ['summary', 'detailed', 'financial', 'sustainability'], description: 'Type of report to generate' },
              },
              required: ['farm_data', 'report_type'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'calculate_crop_yield':
            return await this.handleCalculateCropYield(args);
          case 'analyze_weather_impact':
            return await this.handleAnalyzeWeatherImpact(args);
          case 'calculate_subsidy_eligibility':
            return await this.handleCalculateSubsidyEligibility(args);
          case 'predict_market_prices':
            return await this.handlePredictMarketPrices(args);
          case 'calculate_irrigation_needs':
            return await this.handleCalculateIrrigationNeeds(args);
          case 'analyze_soil_health':
            return await this.handleAnalyzeSoilHealth(args);
          case 'calculate_farm_profitability':
            return await this.handleCalculateFarmProfitability(args);
          case 'generate_farm_report':
            return await this.handleGenerateFarmReport(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async handleCalculateCropYield(args) {
    const { crop_type, area_hectares, soil_quality = 'average', irrigation = false, weather_conditions = 'average', fertilizer_used = false } = args;

    // Base yield rates per hectare (tons)
    const baseYields = {
      wheat: 3.5,
      corn: 8.0,
      rice: 5.5,
      soybeans: 2.8,
      cotton: 1.2,
      potatoes: 25.0,
      tomatoes: 45.0,
    };

    const baseYield = baseYields[crop_type.toLowerCase()] || 4.0;

    // Apply modifiers
    let modifier = 1.0;

    // Soil quality modifier
    const soilModifiers = { poor: 0.7, average: 1.0, good: 1.2, excellent: 1.4 };
    modifier *= soilModifiers[soil_quality] || 1.0;

    // Irrigation modifier
    if (irrigation) modifier *= 1.3;

    // Weather modifier
    const weatherModifiers = { poor: 0.6, average: 1.0, good: 1.1, excellent: 1.2 };
    modifier *= weatherModifiers[weather_conditions] || 1.0;

    // Fertilizer modifier
    if (fertilizer_used) modifier *= 1.15;

    const estimatedYield = baseYield * modifier * area_hectares;

    return {
      content: [
        {
          type: 'text',
          text: `Crop Yield Calculation for ${crop_type}:
• Base yield per hectare: ${baseYield} tons
• Area: ${area_hectares} hectares
• Soil quality: ${soil_quality}
• Irrigation: ${irrigation ? 'Yes' : 'No'}
• Weather conditions: ${weather_conditions}
• Fertilizer used: ${fertilizer_used ? 'Yes' : 'No'}
• Estimated total yield: ${estimatedYield.toFixed(2)} tons
• Yield per hectare: ${(estimatedYield / area_hectares).toFixed(2)} tons/ha`,
        },
      ],
    };
  }

  async handleAnalyzeWeatherImpact(args) {
    const { temperature, rainfall, humidity = 50, crop_type, growth_stage = 'vegetative' } = args;

    let impact = 'neutral';
    let recommendations = [];
    let riskLevel = 'low';

    // Temperature analysis
    const optimalTemps = {
      wheat: { min: 15, max: 25, optimal: 20 },
      corn: { min: 20, max: 30, optimal: 25 },
      rice: { min: 20, max: 35, optimal: 28 },
      soybeans: { min: 20, max: 30, optimal: 25 },
    };

    const cropTemps = optimalTemps[crop_type.toLowerCase()] || { min: 18, max: 28, optimal: 23 };

    if (temperature < cropTemps.min - 5 || temperature > cropTemps.max + 5) {
      impact = 'severe_negative';
      riskLevel = 'high';
      recommendations.push('Extreme temperature may severely impact crop growth');
    } else if (temperature < cropTemps.min || temperature > cropTemps.max) {
      impact = 'negative';
      riskLevel = 'medium';
      recommendations.push('Temperature outside optimal range may reduce yield');
    } else {
      impact = 'positive';
      recommendations.push('Temperature conditions are favorable');
    }

    // Rainfall analysis
    const optimalRainfall = {
      planting: { min: 50, max: 100 },
      vegetative: { min: 100, max: 200 },
      flowering: { min: 50, max: 100 },
      maturation: { min: 20, max: 50 },
      harvest: { min: 0, max: 20 },
    };

    const stageRain = optimalRainfall[growth_stage] || { min: 75, max: 150 };

    if (rainfall < stageRain.min) {
      recommendations.push('Insufficient rainfall - consider irrigation');
      if (impact !== 'severe_negative') riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    } else if (rainfall > stageRain.max) {
      recommendations.push('Excess rainfall may cause waterlogging');
      if (impact !== 'severe_negative') riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    } else {
      recommendations.push('Rainfall is within optimal range');
    }

    return {
      content: [
        {
          type: 'text',
          text: `Weather Impact Analysis for ${crop_type} (${growth_stage} stage):
• Temperature: ${temperature}°C (Optimal: ${cropTemps.optimal}°C)
• Rainfall: ${rainfall}mm
• Humidity: ${humidity}%
• Overall Impact: ${impact.replace('_', ' ').toUpperCase()}
• Risk Level: ${riskLevel.toUpperCase()}
• Recommendations:
  ${recommendations.map(rec => `  - ${rec}`).join('\n')}`,
        },
      ],
    };
  }

  async handleCalculateSubsidyEligibility(args) {
    const { farm_size, crop_types, region, farming_method = 'conventional', income_level = 'medium' } = args;

    // Mock subsidy calculation based on EU Common Agricultural Policy (simplified)
    let baseSubsidyRate = 200; // € per hectare
    let totalSubsidy = 0;
    const eligiblePrograms = [];

    // Size-based subsidies
    if (farm_size < 5) {
      baseSubsidyRate *= 1.2; // Small farm bonus
      eligiblePrograms.push('Small Farm Support');
    } else if (farm_size > 100) {
      baseSubsidyRate *= 0.9; // Large farm adjustment
    }

    // Crop type bonuses
    const cropBonuses = {
      wheat: 1.1,
      corn: 1.05,
      rice: 1.15,
      organic: 1.3,
      sustainable: 1.2,
    };

    let cropMultiplier = 1.0;
    crop_types.forEach(crop => {
      const bonus = cropBonuses[crop.toLowerCase()] || 1.0;
      cropMultiplier = Math.max(cropMultiplier, bonus);
    });

    // Farming method bonus
    if (farming_method === 'organic') {
      cropMultiplier *= 1.3;
      eligiblePrograms.push('Organic Farming Support');
    } else if (farming_method === 'sustainable') {
      cropMultiplier *= 1.2;
      eligiblePrograms.push('Sustainable Farming Initiative');
    }

    // Income level adjustment
    if (income_level === 'low') {
      cropMultiplier *= 1.1;
      eligiblePrograms.push('Low Income Farm Support');
    }

    totalSubsidy = baseSubsidyRate * farm_size * cropMultiplier;

    return {
      content: [
        {
          type: 'text',
          text: `Subsidy Eligibility Calculation:
• Farm Size: ${farm_size} hectares
• Region: ${region}
• Crop Types: ${crop_types.join(', ')}
• Farming Method: ${farming_method}
• Income Level: ${income_level}
• Base Rate: €${baseSubsidyRate}/ha
• Total Estimated Subsidy: €${totalSubsidy.toFixed(2)}
• Eligible Programs:
  ${eligiblePrograms.map(program => `  - ${program}`).join('\n')}`,
        },
      ],
    };
  }

  async handlePredictMarketPrices(args) {
    const { commodity, current_price, time_horizon, market_factors = {} } = args;

    // Simplified price prediction model
    const volatilityFactors = {
      wheat: 0.15,
      corn: 0.12,
      rice: 0.10,
      soybeans: 0.18,
      cotton: 0.20,
    };

    const volatility = volatilityFactors[commodity.toLowerCase()] || 0.15;

    // Time horizon multipliers
    const timeMultipliers = {
      '1month': 0.3,
      '3months': 0.6,
      '6months': 0.8,
      '1year': 1.0,
    };

    const timeMultiplier = timeMultipliers[time_horizon] || 1.0;

    // Apply market factors
    let adjustmentFactor = 1.0;
    if (market_factors.global_demand) adjustmentFactor *= 1.1;
    if (market_factors.weather_impact) adjustmentFactor *= market_factors.weather_impact > 0 ? 1.15 : 0.85;
    if (market_factors.inventory_levels) adjustmentFactor *= market_factors.inventory_levels === 'low' ? 1.2 : 0.9;

    const predictedChange = (Math.random() - 0.5) * 2 * volatility * timeMultiplier * adjustmentFactor;
    const predictedPrice = current_price * (1 + predictedChange);

    const confidence = Math.max(0.1, 1 - volatility * timeMultiplier);

    return {
      content: [
        {
          type: 'text',
          text: `Market Price Prediction for ${commodity}:
• Current Price: $${current_price.toFixed(2)}
• Time Horizon: ${time_horizon}
• Predicted Price: $${predictedPrice.toFixed(2)}
• Expected Change: ${((predictedChange) * 100).toFixed(1)}%
• Confidence Level: ${(confidence * 100).toFixed(1)}%
• Volatility Factor: ${(volatility * 100).toFixed(1)}%
• Market Factors Considered: ${Object.keys(market_factors).join(', ') || 'None'}`,
        },
      ],
    };
  }

  async handleCalculateIrrigationNeeds(args) {
    const { crop_type, area_hectares, soil_type, temperature = 25, humidity = 60, growth_stage = 'vegetative' } = args;

    // Base water requirements in mm per day
    const baseRequirements = {
      wheat: { planting: 2, vegetative: 4, flowering: 5, maturation: 3 },
      corn: { planting: 3, vegetative: 6, flowering: 7, maturation: 4 },
      rice: { planting: 8, vegetative: 10, flowering: 12, maturation: 6 },
      soybeans: { planting: 2, vegetative: 4, flowering: 5, maturation: 3 },
    };

    const cropReqs = baseRequirements[crop_type.toLowerCase()] || { planting: 3, vegetative: 5, flowering: 6, maturation: 3 };
    const baseWater = cropReqs[growth_stage] || cropReqs.vegetative;

    // Soil type adjustment
    const soilFactors = { sandy: 1.3, loamy: 1.0, clay: 0.8 };
    const soilFactor = soilFactors[soil_type] || 1.0;

    // Climate adjustments
    let climateFactor = 1.0;
    if (temperature > 30) climateFactor *= 1.4;
    else if (temperature < 15) climateFactor *= 0.7;

    if (humidity < 40) climateFactor *= 1.2;
    else if (humidity > 80) climateFactor *= 0.8;

    const dailyRequirement = baseWater * soilFactor * climateFactor;
    const totalDailyVolume = (dailyRequirement / 1000) * area_hectares; // Convert mm to meters and multiply by area

    return {
      content: [
        {
          type: 'text',
          text: `Irrigation Requirements Calculation:
• Crop: ${crop_type}
• Area: ${area_hectares} hectares
• Soil Type: ${soil_type}
• Growth Stage: ${growth_stage}
• Temperature: ${temperature}°C
• Humidity: ${humidity}%
• Daily Water Requirement: ${dailyRequirement.toFixed(1)} mm/day
• Total Daily Volume: ${totalDailyVolume.toFixed(2)} million liters
• Irrigation Frequency: Every ${(dailyRequirement < 4 ? '2-3' : '1-2')} days (estimated)`,
        },
      ],
    };
  }

  async handleAnalyzeSoilHealth(args) {
    const { ph_level, nitrogen = 0, phosphorus = 0, potassium = 0, organic_matter = 0, crop_type } = args;

    let health_score = 100;
    const issues = [];
    const recommendations = [];

    // pH analysis
    if (ph_level < 5.5 || ph_level > 8.0) {
      health_score -= 30;
      issues.push('pH level outside optimal range');
      recommendations.push('Apply lime to raise pH or sulfur to lower pH');
    } else if (ph_level < 6.0 || ph_level > 7.5) {
      health_score -= 10;
      issues.push('pH level suboptimal');
    }

    // Nutrient analysis
    const nutrientLevels = { nitrogen, phosphorus, potassium };
    const optimalNutrients = {
      wheat: { nitrogen: 40, phosphorus: 20, potassium: 30 },
      corn: { nitrogen: 50, phosphorus: 25, potassium: 35 },
      rice: { nitrogen: 45, phosphorus: 22, potassium: 32 },
    };

    const cropNutrients = optimalNutrients[crop_type.toLowerCase()] || { nitrogen: 40, phosphorus: 20, potassium: 30 };

    Object.keys(nutrientLevels).forEach(nutrient => {
      const current = nutrientLevels[nutrient];
      const optimal = cropNutrients[nutrient];

      if (current < optimal * 0.5) {
        health_score -= 20;
        issues.push(`Severely deficient in ${nutrient}`);
        recommendations.push(`Apply ${nutrient} fertilizer immediately`);
      } else if (current < optimal * 0.8) {
        health_score -= 10;
        issues.push(`Deficient in ${nutrient}`);
        recommendations.push(`Consider ${nutrient} fertilization`);
      }
    });

    // Organic matter analysis
    if (organic_matter < 2.0) {
      health_score -= 15;
      issues.push('Low organic matter content');
      recommendations.push('Add organic amendments like compost or manure');
    }

    const health_rating = health_score >= 80 ? 'Excellent' : health_score >= 60 ? 'Good' : health_score >= 40 ? 'Fair' : 'Poor';

    return {
      content: [
        {
          type: 'text',
          text: `Soil Health Analysis for ${crop_type}:
• pH Level: ${ph_level}
• Nitrogen: ${nitrogen} ppm
• Phosphorus: ${phosphorus} ppm
• Potassium: ${potassium} ppm
• Organic Matter: ${organic_matter}%
• Health Score: ${health_score}/100 (${health_rating})
• Issues Identified:
  ${issues.length > 0 ? issues.map(issue => `  - ${issue}`).join('\n') : '  None'}
• Recommendations:
  ${recommendations.length > 0 ? recommendations.map(rec => `  - ${rec}`).join('\n') : '  Soil health is good'}`,
        },
      ],
    };
  }

  async handleCalculateFarmProfitability(args) {
    const { total_revenue, total_costs, investment_amount = 0, time_period_years = 1 } = args;

    const gross_profit = total_revenue - total_costs;
    const profit_margin = (gross_profit / total_revenue) * 100;

    let roi = 0;
    if (investment_amount > 0) {
      roi = (gross_profit / investment_amount) * 100;
    }

    const annual_profit = gross_profit / time_period_years;
    const profitability_rating = profit_margin >= 30 ? 'Excellent' : profit_margin >= 20 ? 'Good' : profit_margin >= 10 ? 'Fair' : 'Poor';

    return {
      content: [
        {
          type: 'text',
          text: `Farm Profitability Analysis:
• Total Revenue: $${total_revenue.toFixed(2)}
• Total Costs: $${total_costs.toFixed(2)}
• Gross Profit: $${gross_profit.toFixed(2)}
• Profit Margin: ${profit_margin.toFixed(1)}%
• ${investment_amount > 0 ? `Return on Investment: ${roi.toFixed(1)}%` : ''}
• Annual Profit: $${annual_profit.toFixed(2)}
• Profitability Rating: ${profitability_rating}
• Time Period: ${time_period_years} year(s)`,
        },
      ],
    };
  }

  async handleGenerateFarmReport(args) {
    const { farm_data, report_type } = args;

    let report = '';

    switch (report_type) {
      case 'summary':
        report = this.generateSummaryReport(farm_data);
        break;
      case 'detailed':
        report = this.generateDetailedReport(farm_data);
        break;
      case 'financial':
        report = this.generateFinancialReport(farm_data);
        break;
      case 'sustainability':
        report = this.generateSustainabilityReport(farm_data);
        break;
      default:
        report = 'Invalid report type specified';
    }

    return {
      content: [
        {
          type: 'text',
          text: report,
        },
      ],
    };
  }

  generateSummaryReport(farm_data) {
    return `FARM SUMMARY REPORT
==================

Farm Overview:
• Location: ${farm_data.location || 'Not specified'}
• Size: ${farm_data.size || 0} hectares
• Primary Crops: ${farm_data.crops ? farm_data.crops.join(', ') : 'Not specified'}
• Farming Method: ${farm_data.method || 'Conventional'}

Key Metrics:
• Total Revenue: $${farm_data.revenue || 0}
• Total Costs: $${farm_data.costs || 0}
• Net Profit: $${(farm_data.revenue || 0) - (farm_data.costs || 0)}
• Yield Average: ${farm_data.average_yield || 0} tons/ha

Recommendations:
• Focus on high-margin crops
• Implement cost-saving measures
• Consider sustainable practices`;
  }

  generateDetailedReport(farm_data) {
    return `DETAILED FARM REPORT
===================

Farm Details:
• Name: ${farm_data.name || 'Unnamed Farm'}
• Owner: ${farm_data.owner || 'Not specified'}
• Location: ${farm_data.location || 'Not specified'}
• Total Area: ${farm_data.size || 0} hectares
• Soil Type: ${farm_data.soil_type || 'Not specified'}

Crop Information:
${farm_data.crops ? farm_data.crops.map(crop => `• ${crop}`).join('\n') : 'No crops specified'}

Equipment & Infrastructure:
${farm_data.equipment ? farm_data.equipment.map(item => `• ${item}`).join('\n') : 'No equipment listed'}

Performance Metrics:
• Average Yield: ${farm_data.average_yield || 0} tons/ha
• Water Usage: ${farm_data.water_usage || 0} liters/ha
• Fertilizer Usage: ${farm_data.fertilizer_usage || 0} kg/ha

Financial Summary:
• Annual Revenue: $${farm_data.revenue || 0}
• Operating Costs: $${farm_data.costs || 0}
• Net Income: $${(farm_data.revenue || 0) - (farm_data.costs || 0)}`;
  }

  generateFinancialReport(farm_data) {
    const revenue = farm_data.revenue || 0;
    const costs = farm_data.costs || 0;
    const profit = revenue - costs;

    return `FINANCIAL REPORT
===============

Revenue Breakdown:
• Crop Sales: $${farm_data.crop_sales || 0}
• Subsidies: $${farm_data.subsidies || 0}
• Other Income: $${farm_data.other_income || 0}
• Total Revenue: $${revenue}

Cost Breakdown:
• Seeds & Supplies: $${farm_data.seed_costs || 0}
• Labor: $${farm_data.labor_costs || 0}
• Equipment: $${farm_data.equipment_costs || 0}
• Fertilizer & Pesticides: $${farm_data.chemical_costs || 0}
• Other Expenses: $${farm_data.other_costs || 0}
• Total Costs: $${costs}

Profit Analysis:
• Gross Profit: $${profit}
• Profit Margin: ${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}%
• ROI: ${farm_data.investment ? ((profit / farm_data.investment) * 100).toFixed(1) : 0}%

Financial Health: ${profit > 0 ? 'Positive' : 'Negative'}`;
  }

  generateSustainabilityReport(farm_data) {
    return `SUSTAINABILITY REPORT
====================

Environmental Impact:
• Carbon Footprint: ${farm_data.carbon_footprint || 0} tons CO2/ha
• Water Usage Efficiency: ${farm_data.water_efficiency || 0}%
• Soil Health Score: ${farm_data.soil_health || 0}/100
• Biodiversity Index: ${farm_data.biodiversity || 0}/100

Sustainable Practices:
${farm_data.practices ? farm_data.practices.map(practice => `• ${practice}`).join('\n') : 'No sustainable practices listed'}

Certifications:
${farm_data.certifications ? farm_data.certifications.map(cert => `• ${cert}`).join('\n') : 'No certifications listed'}

Recommendations:
• Implement water conservation techniques
• Adopt organic farming methods
• Enhance soil management practices
• Increase biodiversity on farm`;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Agricultural MCP Server running on stdio');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down Agricultural MCP Server...');
  process.exit(0);
});

async function main() {
  const server = new AgriculturalMCPServer();
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start Agricultural MCP Server:', error);
    process.exit(1);
  });
}

module.exports = AgriculturalMCPServer;