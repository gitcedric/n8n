import {
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodePropertyRouting,
	INodeType,
	INodeTypeDescription,
	IRequestOptionsFromParameters,
} from 'n8n-workflow';

import { get } from 'lodash';

export class MailcheckTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailcheck TEST',
		name: 'mailcheckTest',
		icon: 'file:mailcheck.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailcheck API',
		defaults: {
			name: 'Mailcheck Test',
			color: '#4f44d7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailcheckApi',
				required: true,
				testedBy: {
					request: {
						method: 'GET',
						url: '/webhook/maicheck-auth-test',
					},
					rules: [
						{
							type: 'responseCode',
							properties: {
								value: 403,
								message: 'Does not exist.',
							},
						},
					],
				},
			},
		],
		requestDefaults: {
			baseURL: 'http://localhost:5678',
			// Possible to use expressions and reference data from credentials
			// baseURL: '={{$credentials.host}}',
			url: '',
		},
		// TODO: Think about proper name
		requestOperations: {
			// Different types: https://nordicapis.com/everything-you-need-to-know-about-api-pagination/
			async pagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<INodeExecutionData[]> {
				if (!requestData.options.qs) {
					requestData.options.qs = {};
				}
				const pageSize = 10;
				requestData.options.qs.limit = pageSize;
				requestData.options.qs.offset = 0;
				let tempResponseData: INodeExecutionData[];
				const responseData: INodeExecutionData[] = [];

				do {
					if (requestData?.maxResults) {
						// Only request as many results as needed
						const resultsMissing = (requestData?.maxResults as number) - responseData.length;
						if (resultsMissing < 1) {
							break;
						}
						requestData.options.qs.limit = Math.min(pageSize, resultsMissing);
					}

					tempResponseData = await this.makeRoutingRequest(requestData);
					requestData.options.qs.offset = requestData.options.qs.offset + pageSize;

					// tempResponseData = (
					// 	get(tempResponseData[0].json, 'data', []) as IDataObject[]
					// ).map((item) => {
					// 	return {
					// 		json: item,
					// 	};
					// });

					responseData.push(...tempResponseData);
				} while (tempResponseData.length && tempResponseData.length === pageSize);

				return responseData;
			},
			// pagination: {
			// 	type: 'offset',
			// 	properties: {
			// 		limitParameter: 'limit',
			// 		offsetParameter: 'offset',
			// 		pageSize: 10,
			// 		rootProperty: 'data',
			// 		type: 'query',
			// 	},
			// },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
						// Possible to overwrite requestOperations on option level
						// requestOperations: {
						// 	pagination: {
						// 		type: 'offset',
						// 		properties: {
						// 			limitParameter: 'limit',
						// 			offsetParameter: 'offset',
						// 			pageSize: 10,
						// 			type: 'query',
						// 			// rootProperty: 'data',
						// 		},
						// 	},
						// },
					},
				],
				default: 'email',
				// Possible to overwrite requestOperations on parameter level
				// requestOperations: {
				// 	pagination: {
				// 		type: 'offset',
				// 		properties: {
				// 			limitParameter: 'limit',
				// 			offsetParameter: 'offset',
				// 			pageSize: 10,
				// 			type: 'query',
				// 			// rootProperty: 'data',
				// 		},
				// 	},
				// },
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Check',
						value: 'check',
						routing: {
							request: {
								method: 'POST',
								url: '/singleEmail:check',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						routing: {
							request: {
								method: 'POST',
								url: '/singleEmail:delete',
							},
						},
					},
					{
						name: 'Download',
						value: 'download',
						routing: {
							request: {
								method: 'GET',
								baseURL: 'http://www.africau.edu',
								url: '/images/default/sample.pdf',
							},
						},
					},
				],
				// The "request" can be defined both on the property or the option
				// request: {
				// 	method: 'POST',
				// 	url: '=/singleEmail:{{$value}}',
				// },
				default: 'check',
			},

			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'download',
						],
					},
				},
				routing: {
					output: {
						postReceive: {
							type: 'binaryData',
							properties: {
								destinationProperty: '={{$value}}',
							},
						},
					},
				},
				description: 'Name of the binary property to which to write the data of the read file.',
			},

			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'delete',
						],
					},
				},
				routing: {
					request: {
						method: 'DELETE',
						url: '=/senders/{{$value}}', // send value in path
					},
					output: {
						postReceive: {
							type: 'set',
							properties: {
								value: '={{ { "success": true } }}',
								// value: '={{ { "success": $response } }}', // Also possible to use the original response data
							},
						},
						// Identical with the above
						// async postReceive (this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse,): Promise<INodeExecutionData[]> {
						// 	return [
						// 		{
						// 			json: {
						// 				success: true,
						// 			}
						// 		}
						// 	];
						// },
					},
				},
			},

			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				routing: {
					send: {
						// Transform request before it gets send
						async preSend (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
							requestOptions.qs = (requestOptions.qs || {}) as IDataObject;
							// if something special is required it is possible to write custom code and get from parameter
							requestOptions.qs.sender = this.getNodeParameter('sender');
							return requestOptions;
						},
					},
					output: {
						// Transform the received data
						async postReceive (this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse,): Promise<INodeExecutionData[]> {
							items.forEach(item => item.json = { success: true });
							return items;
						},
					},
				},
				default: '',
				description: 'Email address to check.',
			},
			{
				displayName: 'Pagination',
				name: 'pagination',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				routing: {
					send: {
						paginate: '={{$value}}', // Activate pagination depending on value of current parameter
					},
				},
				default: false,
				description: 'To test pagination.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
						pagination: [
							true,
						],
					},
				},
				default: false,
				routing: {
					request: {
						method: 'GET',
						// url: 'webhook/pagination-offset',
						url: 'webhook/pagination-offset-sub',
					},
					// send: {
					// 	type: 'body',
					// 	property: 'whatever',
					// },
					output: {
						// rootProperty: 'data',
						// Data to returned underneath a property called "data"
						postReceive: {
							type: 'rootProperty',
							properties: {
								property: 'data',
							},
						},
					},
				},
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
						pagination: [
							true,
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 10,
				routing: {
					output: {
						maxResults: '={{$value}}', // Set maxResults to the value of current parameter
					},
				},
				description: 'How many results to return.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				routing: {
					send: {
						property: 'toEmail', // Simple set
						type: 'body',
						value: '={{$value.toUpperCase()}}', // Change value that gets send via an expression
					},
				},
				default: '',
				description: 'Email address to check.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				routing: {
					send: {
						property: 'message.text', // Set on lower level with dot-notation
						type: 'body',
					},
				},
				default: '',
				description: 'The message.',
			},

			// Test collection
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Some Value',
						name: 'someValue',
						type: 'string',
						routing: {
							send: {
								property: 'some.value',
								propertyInDotNotation: false, // send as "some.value"
								// If type is not set it will be send in in "query"
								// type: 'query',
							},
						},
						default: '',
					},
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						routing: {
							send: {
								property: 'dealId',
								type: 'query',
							},
						},
						description: 'ID of the deal this activity will be associated with',
					},
					{
						displayName: 'Due Date',
						name: 'due_date',
						type: 'dateTime',
						default: '',
						routing: {
							send: {
								type: 'query',
							},
						},
						description: 'Due Date to activity be done YYYY-MM-DD',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptions: {
								routing: {
									request: {
										url: '/webhook/mock-option-parameters',
										// url: '/webhook/mock-option-parameters-simple',
										// Data from the current node can be accessed via $parameters (only in "loadOptions")
										// url: '=/webhook/mock-option-parameters/{{$parameters.email}}',
										method: 'GET',
									},
									output: {
										postReceive: {
											type: 'setKeyValue',
											properties: {
												rootProperty: 'responseData',
												sort: {
													// No expression supported
													key: 'name',
												},
												values: {
													name: '={{$responseItem.key}} ({{$responseItem.value}})xxx',
													value: '={{$responseItem.value}}',
												},
											},
										},
									},
									// operations: {
									// 	// Is possible to overwrite pagination for loadOptions. (Limitation: only via JSON, not funciton code)
									// 	pagination: {
									// 		type: 'offset',
									// 		properties: {
									// 			limitParameter: 'limit',
									// 			offsetParameter: 'offset',
									// 			pageSize: 10,
									// 			rootProperty: 'data',
									// 			type: 'body',
									// 		},
									// 	},
									// },
								},
							},
						},
						default: '',
					},
					{
						displayName: 'Lower Level',
						name: 'lowerLevel',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						options: [
							{
								displayName: 'Deal ID',
								name: 'deal_id',
								type: 'number',
								default: 0,
								routing: {
									send: {
										property: 'dealId2',
										type: 'query',
									},
								},
								description: 'ID of the deal this activity will be associated with',
							},
							{
								displayName: 'Due Date',
								name: 'due_date',
								type: 'dateTime',
								default: '',
								routing: {
									send: {
										property: 'due_date2',
										type: 'query',
									},
								},
								description: 'Due Date to activity be done YYYY-MM-DD',
							},

						],
					},
				],
			},

			// Test fixed collection0: multipleValues=false
			{
				displayName: 'Custom Properties0 (single)',
				name: 'customPropertiesSingle0',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [

							// To set: { single-name: 'value' }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=single-{{$parent.name}}',
										type: 'body',
									},
								},
								description: 'Value of the property to set.',
							},
						],
					},
				],
			},

			// Test fixed collection1: multipleValues=false
			{
				displayName: 'Custom Properties1 (single)',
				name: 'customPropertiesSingle1',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							// To set: { single-customValues: { name: 'name', value: 'value'} }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: 'single-customValues.name',
									},
								},
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: 'single-customValues.value',
									},
								},
								description: 'Value of the property to set.',
							},
						],
					},
				],
			},

			// Test fixed collection: multipleValues=true
			{
				displayName: 'Custom Properties (multi)',
				name: 'customPropertiesMulti',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'property0',
						displayName: 'Property0',
						values: [

							// To set: { name0: 'value0', name1: 'value1' }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '={{$parent.name}}',
										type: 'body',
									},
								},
								description: 'Value of the property to set.',
							},
						],
					},


					{
						name: 'property1',
						displayName: 'Property1',
						values: [
							// To set: { customValues: [ { name: 'name0', value: 'value0'}, { name: 'name1', value: 'value1'} ]}
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=customValues[{{$index}}].name',
										type: 'body',
									},
								},
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=customValues[{{$index}}].value',
										type: 'body',
									},
								},
								description: 'Value of the property to set.',
							},
						],
					},

				],
			},

		],
	};

}