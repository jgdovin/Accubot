const { BotMock, SlackApiMock } = require('botkit-mock');
const {SlackAdapter, SlackMessageTypeMiddleware, SlackEventMiddleware} = require('botbuilder-adapter-slack');

const yourController = require("../features/pizzas");

describe('slack message',()=>{
    beforeEach(()=>{
       const adapter = new SlackAdapter(SlackApiMock.slackAdapterMockParams);
   
        adapter.use(new SlackEventMiddleware());
        adapter.use(new SlackMessageTypeMiddleware());
   
        this.controller = new BotMock({
            adapter: adapter,
            disable_webserver: true
        });
   
        SlackApiMock.bindMockApi(this.controller);
        yourController(this.controller);
    });

    it('should return `help message` if user types `help`', async () => {
        const message = await this.controller.usersInput(
            [
                {   
                    type: "message",
                    user: 'someUserId',
                    channel: 'someChannel',
                    messages: [
                        {
                            text: '@<asdcfjk> :pizza:', isAssertion: true
                        }
                    ]
                }
            ]
        );
        console.log(message);
        expect(message.text).toBe('help message');
    });
});