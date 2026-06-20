import { FC } from 'react';
import { IRoomData, LocalizeText } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';

interface NavigatorRoomSettingsTabViewProps
{
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = props =>
{
    const { roomData = null, handleChange = null } = props;

    return (
        <>
            <Column gap={ 1 }>
                <Text bold>{ LocalizeText('navigator.roomsettings.vip.caption') }</Text>
                <Text>{ LocalizeText('navigator.roomsettings.vip.info') }</Text>
            </Column>
            <Column gap={ 1 }>
                <Flex alignItems="center" gap={ 1 }>
                    <input className="form-check-input" type="checkbox" checked={ roomData.hideWalls } onChange={ event => handleChange('hide_walls', event.target.checked) } />
                    <Text>Hide room walls</Text>
                </Flex>
                <Text bold small>{ LocalizeText('navigator.roomsettings.wall_thickness') }</Text>
                <select className="form-select form-select-sm" value={ roomData.wallThickness } onChange={ event => handleChange('wall_thickness', event.target.value) }>
                    <option value="0">{ LocalizeText('navigator.roomsettings.wall_thickness.normal') }</option>
                    <option value="1">{ LocalizeText('navigator.roomsettings.wall_thickness.thick') }</option>
                    <option value="-1">{ LocalizeText('navigator.roomsettings.wall_thickness.thin') }</option>
                    <option value="-2">{ LocalizeText('navigator.roomsettings.wall_thickness.thinnest') }</option>
                </select>
                <Text bold small>{ LocalizeText('navigator.roomsettings.floor_thickness') }</Text>
                <select className="form-select form-select-sm" value={ roomData.floorThickness } onChange={ event => handleChange('floor_thickness', event.target.value) }>
                    <option value="0">{ LocalizeText('navigator.roomsettings.floor_thickness.normal') }</option>
                    <option value="1">{ LocalizeText('navigator.roomsettings.floor_thickness.thick') }</option>
                    <option value="-1">{ LocalizeText('navigator.roomsettings.floor_thickness.thin') }</option>
                    <option value="-2">{ LocalizeText('navigator.roomsettings.floor_thickness.thinnest') }</option>
                </select>
            </Column>
        </>
    );
}
