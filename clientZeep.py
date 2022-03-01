import zeep

wsdl = 'http://localhost:8000/?wsdl'
client = zeep.Client(wsdl=wsdl)


car = 'SmartFor2'

print(client.service.autonomy(car))
print(client.service.chargeTime(car))
