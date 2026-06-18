import { RoomControllerLevel, RoomObjectOperationType } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { FaArrowsAlt, FaSyncAlt, FaTrash, FaTrashRestore } from 'react-icons/fa';
import { AvatarInfoFurni, EnsureRoomItemDeleteComposerRegistered, ProcessRoomObjectOperation, RoomItemDeleteComposer, SendMessageComposer } from '../../../../../api';
import { Flex } from '../../../../../common';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetFurniViewProps
{
    avatarInfo: AvatarInfoFurni;
    onClose: () => void;
}

export const AvatarInfoWidgetFurniView: FC<AvatarInfoWidgetFurniViewProps> = props =>
{
    const { avatarInfo = null, onClose = null } = props;

    const processAction = (name: string) =>
    {
        if(name)
        {
            switch(name)
            {
                case 'move':
                    ProcessRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_MOVE);
                    break;
                case 'rotate':
                    ProcessRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                    break;
                case 'pickup':
                    ProcessRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_PICKUP);
                    break;
                case 'eject':
                    ProcessRoomObjectOperation(avatarInfo.id, avatarInfo.category, RoomObjectOperationType.OBJECT_EJECT);
                    break;
                case 'delete':
                    if(!window.confirm('Permanently delete "' + (avatarInfo.name || 'this item') + '" from the game?\n\nThis cannot be undone — the item is destroyed, not returned to inventory.')) break;

                    if(!EnsureRoomItemDeleteComposerRegistered()) break;

                    SendMessageComposer(new RoomItemDeleteComposer(avatarInfo.id));
                    break;
            }
        }

        onClose();
    }

    return (
        <ContextMenuView objectId={ avatarInfo.id } category={ avatarInfo.category } onClose={ onClose } collapsable={ true }>
            <ContextMenuHeaderView>
                { avatarInfo.name }
            </ContextMenuHeaderView>
            <Flex className="menu-list-split-3">
                <ContextMenuListItemView onClick={ event => processAction('move') }>
                    <FaArrowsAlt className="center fa-icon" />
                </ContextMenuListItemView>
                <ContextMenuListItemView onClick={ event => processAction('rotate') } disabled={ avatarInfo.isWallItem }>
                    <FaSyncAlt className="center fa-icon" />
                </ContextMenuListItemView>
                { (avatarInfo.isOwner || avatarInfo.isAnyRoomController) &&
                    <ContextMenuListItemView onClick={ event => processAction('pickup') }>
                        <FaTrashRestore className="center fa-icon" />
                    </ContextMenuListItemView> }
                { (!avatarInfo.isOwner && !avatarInfo.isAnyRoomController) && (avatarInfo.isRoomOwner || (avatarInfo.roomControllerLevel >= RoomControllerLevel.GUILD_ADMIN)) &&
                    <ContextMenuListItemView onClick={ event => processAction('eject') }>
                        <FaTrashRestore className="center fa-icon" />
                    </ContextMenuListItemView> }
                { avatarInfo.isAnyRoomController &&
                    <ContextMenuListItemView onClick={ event => processAction('delete') }>
                        <FaTrash className="center fa-icon text-danger" />
                    </ContextMenuListItemView> }
            </Flex>
        </ContextMenuView>
    );
}
